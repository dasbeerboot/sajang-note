'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastContext';
import axios from 'axios';

type SubscriptionStatusValue = 'active' | 'canceled' | 'none' | 'free'; // 'free' 추가 또는 기존 상태와 통합 고려

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean | null;
  user_status: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_end_date: string | null;
  max_places: number;
  billing_id: string | null;
  card_info: Record<string, unknown> | null;
  next_place_change_date: string | null;
  remaining_place_changes: number;
  free_trial_copy_remaining: number | null;
  is_new_user: boolean | null;
  credits: number;
  last_credits_refresh: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  refreshProfileData: () => Promise<void>;
  isProfileComplete: boolean;
  subscriptionStatus: SubscriptionStatusValue | null;
  setProfile: (profile: Profile | null) => void;
  supabase: SupabaseClient; // supabase 인스턴스를 컨텍스트에 추가 (선택적이지만 편리할 수 있음)
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => getSupabaseBrowserClient()); // 컴포넌트 마운트 시 한 번만 클라이언트 생성
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusValue | null>(
    null
  ); // 추가
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  const fetchAndSetUserProfile = useCallback(
    async (currentSession: Session | null) => {
      if (currentSession?.user) {
        setUser(currentSession.user);
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*') // 모든 필드를 가져오도록 변경
            .eq('id', currentSession.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('[AuthContext] 프로필 정보 조회 중 오류:', error);
            setIsProfileComplete(false);
            setSubscriptionStatus(null);
          } else if (profile) {
            // profile이 null이 아닌 경우에만 접근
            const isComplete = !!(profile.phone_verified && profile.full_name);
            setIsProfileComplete(isComplete);
            setSubscriptionStatus(profile.subscription_status as SubscriptionStatusValue);

            // 프로필 전체 정보 설정 (크레딧 정보 포함)
            setProfile(profile);

            console.log('[AuthContext] 프로필 정보 로드 완료:', {
              id: profile.id,
              credits: profile.credits || 0,
              last_credits_refresh: profile.last_credits_refresh,
            });

            // 카카오 로그인 사용자이고, provider_token이 있으며, 프로필 정보가 부족할 경우 카카오 API 호출
            if (
              currentSession.user.app_metadata.provider === 'kakao' &&
              currentSession.provider_token
            ) {
              try {
                const kakaoUserResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
                  headers: {
                    Authorization: `Bearer ${currentSession.provider_token}`,
                    'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
                  },
                });
                const kakaoUserInfo = kakaoUserResponse.data;

                const profileDataToUpdate: {
                  full_name?: string;
                  email?: string;
                  phone?: string;
                  phone_verified?: boolean;
                  updated_at?: string;
                } = {};
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

                  if (kakaoPhoneNumber) {
                    // 처리된 전화번호가 존재할 경우
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
                    console.error(
                      '[AuthContext] Error updating profile with Kakao data:',
                      updateError
                    );
                  } else {
                    // 프로필 업데이트 후 전체 프로필 데이터 다시 조회
                    const { data: updatedProfile, error: fetchError } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', currentSession.user.id)
                      .single();

                    if (!fetchError && updatedProfile) {
                      setProfile(updatedProfile);
                      console.log('[AuthContext] 카카오 정보로 업데이트된 프로필 정보 로드 완료:', {
                        id: updatedProfile.id,
                        credits: updatedProfile.credits || 0,
                        last_credits_refresh: updatedProfile.last_credits_refresh,
                      });
                    }
                  }
                }
              } catch (kakaoApiError: unknown) {
                let errorMessage = 'Unknown error';
                if (axios.isAxiosError(kakaoApiError) && kakaoApiError.response?.data) {
                  errorMessage = JSON.stringify(kakaoApiError.response.data);
                } else if (kakaoApiError instanceof Error) {
                  errorMessage = kakaoApiError.message;
                }
                console.error(
                  '[AuthContext] Error fetching Kakao user info from API:',
                  errorMessage
                );
              }
            }
          }
        } catch (profileError) {
          console.error('[AuthContext] Outer error fetching profile:', profileError);
          setIsProfileComplete(false);
          setSubscriptionStatus(null); // 오류 시 초기화
        }
      } else {
        setUser(null);
        setIsProfileComplete(false);
        setSubscriptionStatus(null); // 사용자 없으면 구독 상태도 초기화
      }
      setLoading(false);
    },
    [supabase]
  );

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
  }, [supabase, fetchAndSetUserProfile]);

  const signOut = async () => {
    try {
      // 현재 세션이 있는지 먼저 확인 (더 확실하게는 await supabase.auth.getSession() 사용)
      if (!session) {
        console.warn('[AuthContext] 이미 로그아웃된 상태이거나 세션이 없습니다.');
        setUser(null);
        // setSession(null); // session 상태는 onAuthStateChange 리스너에 의해 업데이트 될 것임
        setIsProfileComplete(false);
        setSubscriptionStatus(null); // 로그아웃 시 구독 상태 초기화
        if (router && typeof router.push === 'function') router.push('/');
        return;
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        if (error.name === 'AuthSessionMissingError') {
          console.warn('[AuthContext] 로그아웃 시 서버에 이미 세션이 없었습니다:', error.message);
          // 이 경우, 이미 서버 세션은 없으므로 클라이언트 상태만 정리
        } else {
          throw error; // 다른 종류의 에러는 그대로 throw
        }
      }

      // supabase.auth.signOut()이 성공했거나 AuthSessionMissingError인 경우,
      // onAuthStateChange 리스너가 session과 user를 null로 설정할 것이므로,
      // 여기서는 명시적으로 setUser(null), setSession(null)을 호출할 필요가 없을 수 있습니다.
      // 하지만 확실한 초기화를 위해 남겨두거나, 리스너 동작에 따라 조정할 수 있습니다.
      setUser(null);
      setSession(null);
      setIsProfileComplete(false);
      setSubscriptionStatus(null); // 로그아웃 시 구독 상태 초기화
      showToast('로그아웃 되었습니다.', 'success');
      if (router && typeof router.push === 'function') router.push('/');
    } catch (error: unknown) {
      console.error('로그아웃 오류:', error);
      showToast('로그아웃 중 오류가 발생했습니다.', 'error');

      setUser(null);
      setSession(null);
      setIsProfileComplete(false);
      setSubscriptionStatus(null); // 오류 시에도 구독 상태 초기화
      if (router && typeof router.push === 'function') {
        router.push('/');
      } else {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }
  };

  const signInWithKakao = async () => {
    // Implementation of signInWithKakao
  };

  const refreshProfileData = async () => {
    // Implementation of refreshProfileData
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    signInWithKakao,
    refreshProfileData,
    isProfileComplete,
    subscriptionStatus,
    setProfile,
    supabase, // supabase 인스턴스 컨텍스트 통해 제공
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
