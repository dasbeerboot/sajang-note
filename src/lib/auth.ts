'use client';

import { getSupabaseBrowserClient } from './supabase';

// 현재 환경에 맞는 콜백 URL을 반환하는 헬퍼 함수
const getRedirectUrl = () => {
  // 클라이언트 사이드에서 NEXT_PUBLIC_SITE_URL 환경 변수를 우선 사용하고, 없으면 window.location.origin 사용
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  if (!siteUrl) {
    console.warn(
      'Warning: NEXT_PUBLIC_SITE_URL is not set and window.location.origin is unavailable. Callback URL might be incorrect.'
    );
    // 매우 기본적인 fallback (프로덕션에서는 반드시 NEXT_PUBLIC_SITE_URL 설정 필요)
    return 'http://localhost:3000/auth/callback';
  }
  return `${siteUrl}/auth/callback`;
};

/**
 * 이메일과 비밀번호로 로그인합니다.
 */
export const signInWithPassword = async (email: string, password: string) => {
  const supabase = getSupabaseBrowserClient();
  // signInWithPassword는 직접적인 redirectTo 옵션이 email 확인 링크용이므로,
  // 여기서는 일반 로그인 후 리다이렉트는 클라이언트가 알아서 처리.
  // 만약 이메일 확인(confirm email) 후 특정 페이지로 보내고 싶다면 emailRedirectTo를 사용.
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

/**
 * 이메일 OTP로 로그인합니다.
 */
export const signInWithOtp = async (email: string) => {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getRedirectUrl(),
    },
  });

  return { data, error };
};

/**
 * Google OAuth로 로그인합니다.
 */
export const signInWithGoogle = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl(),
    },
  });

  return { data, error };
};

/**
 * Kakao OAuth로 로그인합니다.
 * 필요한 스코프를 queryParams로 전달합니다.
 */
export const signInWithKakao = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: getRedirectUrl(),
      scopes: 'profile_nickname,profile_image,account_email,name,phone_number',
    },
  });

  if (error) {
    console.error('카카오 로그인 오류:', error);
  }

  return { data, error };
};

/**
 * 로그아웃합니다.
 */
export const signOut = async () => {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  return { error };
};
