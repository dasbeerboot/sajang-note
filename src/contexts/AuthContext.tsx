'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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
  
  // 사용자 프로필 상태 확인 (useCallback으로 메모이제이션)
  const checkProfileStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone_verified, full_name')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('프로필 정보 가져오기 오류:', error);
        return;
      }
      
      const isComplete = !!(data && data.phone_verified && data.full_name);
      setIsProfileComplete(isComplete);
      
      // 현재 URL이 /profile/setup이 아니고, 프로필이 완료되지 않았으면 리다이렉트
      const isSetupPage = window.location.pathname === '/profile/setup';
      if (!isComplete && !isSetupPage) {
        router.push('/profile/setup');
      }
    } catch (error) {
      console.error('프로필 상태 확인 오류:', error);
    }
  }, [router]);

  useEffect(() => {
    // 초기 세션 상태 가져오기
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          // 사용자 프로필 정보 확인
          checkProfileStatus(initialSession.user.id);
        }
      } catch (error) {
        console.error('세션 가져오기 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 인증 상태 변경 이벤트 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // 사용자 프로필 정보 확인
          await checkProfileStatus(newSession.user.id);
        }
        
        setLoading(false);
      }
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      subscription.unsubscribe();
    };
  }, [router, checkProfileStatus]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('로그아웃 오류:', error);
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