'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GoogleLogo } from '@phosphor-icons/react';

export default function AuthButtons() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('카카오 로그인 오류:', error);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="btn btn-outline gap-2"
      >
        <GoogleLogo size={24} weight="bold" />
        Google로 계속하기
      </button>
      
      <button
        onClick={handleKakaoLogin}
        disabled={loading}
        className="btn bg-[#FEE500] text-[#000000] border-none hover:bg-[#E6CF00] hover:text-[#000000]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 4C7.58172 4 4 6.78579 4 10.2c0 2.2635 1.50244 4.2699 3.77058 5.4247l-.77444 2.8937c-.0641.2384.2187.4202.4239.2726l3.32682-2.0872C11.1882 16.8135 11.5875 16.8398 12 16.8398c4.4183 0 8-2.7858 8-6.2398C20 6.78579 16.4183 4 12 4z" fill="currentColor"/>
        </svg>
        카카오로 계속하기
      </button>
    </div>
  );
} 