'use client';

import { useState } from 'react';
import { FormEvent } from 'react';
import { GoogleLogo, Envelope } from '@phosphor-icons/react';
import { signInWithOtp, signInWithGoogle, signInWithKakao } from '@/lib/auth';

export default function AuthButtons() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle();
      
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
      const { error } = await signInWithKakao();
      
      if (error) throw error;
    } catch (error) {
      console.error('카카오 로그인 오류:', error);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('유효한 이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await signInWithOtp(email);
      
      if (error) throw error;
      setEmailSent(true);
    } catch (error) {
      console.error('이메일 로그인 오류:', error);
      alert('로그인 링크 전송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
      {!showEmailForm ? (
        <>
          {/* <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-outline gap-2"
          >
            <GoogleLogo size={24} weight="bold" />
            Google로 계속하기
          </button> */}
          
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

          <div className="divider text-xs text-gray-500">또는</div>

          <button
            onClick={() => setShowEmailForm(true)}
            className="btn btn-outline btn-primary gap-2"
          >
            <Envelope size={24} weight="bold" />
            이메일로 시작하기
          </button>
        </>
      ) : emailSent ? (
        <div className="text-center p-4">
          <h3 className="font-bold mb-2">이메일을 확인해주세요</h3>
          <p className="text-sm mb-4">
            {email}로 로그인 링크를 전송했습니다.<br />
            이메일의 링크를 클릭하여 로그인을 완료하세요.
          </p>
          <button 
            onClick={() => {
              setShowEmailForm(false);
              setEmailSent(false);
              setEmail('');
            }}
            className="btn btn-sm btn-outline"
          >
            돌아가기
          </button>
        </div>
      ) : (
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text">이메일</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소를 입력하세요"
              className="input input-bordered"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? <span className="loading loading-spinner loading-xs"></span> : '로그인 링크 받기'}
          </button>
          <button
            type="button"
            onClick={() => setShowEmailForm(false)}
            className="btn btn-ghost btn-sm"
          >
            돌아가기
          </button>
        </form>
      )}
    </div>
  );
} 