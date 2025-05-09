'use client';

import { supabase } from './supabase';

/**
 * 이메일과 비밀번호로 로그인합니다.
 */
export const signInWithPassword = async (email: string, password: string) => {
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
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    }
  });
  
  return { data, error };
};

/**
 * Google OAuth로 로그인합니다.
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  return { data, error };
};

/**
 * Kakao OAuth로 로그인합니다.
 * 필요한 스코프를 명시적으로 지정합니다.
 */
export const signInWithKakao = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'profile_nickname profile_image account_email name phone_number',
    },
  });
  
  return { data, error };
};

/**
 * 로그아웃합니다.
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
}; 