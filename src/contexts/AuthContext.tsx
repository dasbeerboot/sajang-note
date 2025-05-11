'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastContext';
import axios from 'axios';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isProfileComplete: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  
  const fetchAndSetUserProfile = useCallback(async (currentSession: Session | null) => {
    if (currentSession?.user) {
      setUser(currentSession.user);
      // 프로필 기본 정보 확인 (phone_verified, full_name 등)
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('phone_verified, full_name, phone, email') // phone, email도 가져와서 비교/업데이트
          .eq('id', currentSession.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: row not found, 이건 정상일 수 있음
          setIsProfileComplete(false);
        } else {
          const isComplete = !!(profile && profile.phone_verified && profile.full_name);
          setIsProfileComplete(isComplete);

          // 카카오 로그인 사용자이고, provider_token이 있으며, 프로필 정보가 부족할 경우 카카오 API 호출
          if (currentSession.user.app_metadata.provider === 'kakao' && currentSession.provider_token) {
            try {
              const kakaoUserResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
                headers: {
                  'Authorization': `Bearer ${currentSession.provider_token}`,
                  'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
                }
              });
              const kakaoUserInfo = kakaoUserResponse.data;

              const profileDataToUpdate: { full_name?: string; email?: string; phone?: string; phone_verified?: boolean; updated_at?: string; } = {};
              let needsUpdate = false;

              const kakaoAccount = kakaoUserInfo.kakao_account;
              if (kakaoAccount) {
                const kakaoNickname = kakaoAccount.profile?.nickname;
                const kakaoEmail = kakaoAccount.email;
                // 전화번호 직접 사용 (존재하는 경우)
                const kakaoPhoneNumberRaw = kakaoAccount.phone_number;

                const kakaoPhoneNumber = kakaoPhoneNumberRaw 
                                        ? kakaoPhoneNumberRaw.replace(/^\+82\s?10/, '010').replace(/[^0-9]/g, '') // +82 10 또는 +8210 -> 010으로 시작하고 숫자만 남김
                                        : null;
                
                if (kakaoNickname && profile?.full_name !== kakaoNickname) {
                  profileDataToUpdate.full_name = kakaoNickname;
                  needsUpdate = true;
                }
                if (kakaoEmail && profile?.email !== kakaoEmail) {
                  profileDataToUpdate.email = kakaoEmail;
                  needsUpdate = true;
                }
                
                if (kakaoPhoneNumber) { // 처리된 전화번호가 존재할 경우
                  if (profile?.phone !== kakaoPhoneNumber || !profile?.phone_verified) {
                    profileDataToUpdate.phone = kakaoPhoneNumber;
                    profileDataToUpdate.phone_verified = true; // 카카오에서 받은 전화번호는 인증된 것으로 간주
                    needsUpdate = true;
                  }
                } else if (kakaoPhoneNumberRaw) {
                  // 원본 전화번호는 있지만 처리 후 null이 된 경우 (예: 형식 문제)
                }
              }

              if (needsUpdate) {
                profileDataToUpdate.updated_at = new Date().toISOString();
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update(profileDataToUpdate)
                  .eq('id', currentSession.user.id);
                if (updateError) {
                  console.error('[AuthContext] Error updating profile with Kakao data:', updateError);
                } else {
                  // 프로필 업데이트 후 상태 다시 확인 (선택적)
                  // await checkProfileStatus(currentSession.user.id); 
                }
              }
            } catch (kakaoApiError: unknown) {
              let errorMessage = 'Unknown error';
              if (axios.isAxiosError(kakaoApiError) && kakaoApiError.response?.data) {
                errorMessage = JSON.stringify(kakaoApiError.response.data);
              } else if (kakaoApiError instanceof Error) {
                errorMessage = kakaoApiError.message;
              }
              console.error('[AuthContext] Error fetching Kakao user info from API:', errorMessage);
            }
          }
        }
      } catch (profileError) {
         console.error('[AuthContext] Outer error fetching profile:', profileError);
         setIsProfileComplete(false);
      }
    } else {
      setUser(null);
      setIsProfileComplete(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      fetchAndSetUserProfile(initialSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      fetchAndSetUserProfile(newSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchAndSetUserProfile]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setIsProfileComplete(false);
      showToast('로그아웃 되었습니다.', 'success');
      router.push('/');
      setTimeout(() => { window.location.href = '/'; }, 100);
    } catch (error) {
      console.error('로그아웃 오류:', error);
      showToast('로그아웃 중 오류가 발생했습니다.', 'error');
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    isProfileComplete,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 