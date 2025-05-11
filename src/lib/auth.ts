'use client';

import { getSupabaseBrowserClient } from './supabase';

/**
 * 이메일과 비밀번호로 로그인합니다.
 */
export const signInWithPassword = async (email: string, password: string) => {
  const supabase = getSupabaseBrowserClient();
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
      emailRedirectTo: window.location.href,
    }
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
      redirectTo: window.location.href,
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
      redirectTo: window.location.href,
      scopes: 'profile_nickname,profile_image,account_email,name,phone_number'
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