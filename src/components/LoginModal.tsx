'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Envelope } from '@phosphor-icons/react';
import { signInWithPassword, signInWithKakao } from '@/lib/auth';
import { useAuthModal } from '@/contexts/AuthModalContext';

interface LoginModalProps {
  modalId: string;
}

export default function LoginModal({ modalId }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const { authModalRef, closeAuthModal } = useAuthModal();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await signInWithPassword(email, password);
      
      if (error) throw error;
      
      closeAuthModal();
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // const handleGoogleLogin = async () => {
  //   setLoading(true);
  //   try {
  //     const { error } = await signInWithGoogle();
      
  //     if (error) throw error;
  //   } catch (error: Error | unknown) {
  //     const errorMessage = error instanceof Error ? error.message : 'Google 로그인 오류';
  //     setError(errorMessage);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithKakao();
      
      if (error) throw error;
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '카카오 로그인 오류';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setShowEmailForm(false);
    closeAuthModal();
  };

  return (
    <dialog id={modalId} className="modal" ref={authModalRef} onClose={resetAndClose}>
      <div className="modal-box max-w-md">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={resetAndClose}>✕</button>
        <h3 className="font-bold text-lg mb-6 text-center">로그인 / 회원가입</h3>
        
        {error && (
          <div className="bg-error/10 text-error p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        {!showEmailForm ? (
          <>
            <p className="text-center text-sm opacity-80 mb-6">
              사장노트의 모든 기능을 이용하려면 로그인이 필요합니다.
            </p>

            {/* <div className="flex flex-col gap-3 w-full max-w-xs mx-auto mb-1">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="btn btn-outline gap-2"
              >
                <GoogleLogo size={24} weight="bold" />
                구글로 계속하기
              </button>
            </div> */}
            
            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
              <button
                onClick={async () => { await handleKakaoLogin(); closeAuthModal();}}
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
                onClick={() => {
                  setShowEmailForm(true);
                  setError(null);
                }}
                className="btn btn-outline btn-primary gap-2"
              >
                <Envelope size={24} weight="bold" />
                이메일로 계속하기
              </button>
            </div>
          </>
        ) : (
          <div className="w-full max-w-xs mx-auto py-4">
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">이메일</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소"
                  className="input input-bordered w-full"
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">비밀번호</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="input input-bordered w-full"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-2"
              >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : '로그인'}
              </button>
            </form>
            
            <div className="text-center text-sm mt-6">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium" onClick={resetAndClose}>
                회원가입
              </Link>
            </div>
            
            <button
              type="button"
              onClick={() => {
                setShowEmailForm(false);
                setError(null);
              }}
              className="btn btn-ghost btn-sm w-full mt-4"
            >
              &larr; 소셜 로그인 및 다른 방법
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
} 