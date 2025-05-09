'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleLogo, Envelope } from '@phosphor-icons/react';
import { signInWithPassword, signInWithOtp, signInWithGoogle, signInWithKakao } from '@/lib/auth';

// 검색 파라미터를 처리하는 컴포넌트
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  useEffect(() => {
    if (verified === 'true') {
      setSuccessMessage('휴대폰 인증이 완료되었습니다. 로그인해 주세요.');
    }
  }, [verified]);
  
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await signInWithPassword(email, password);
      
      if (error) throw error;
      
      // 로그인 성공 시 홈페이지로 이동
      router.push('/');
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('유효한 이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { error } = await signInWithOtp(email);
      
      if (error) throw error;
      setEmailSent(true);
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '로그인 링크 전송 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle();
      
      if (error) throw error;
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithKakao();
      
      if (error) throw error;
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-base-200 p-8 rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center">사장노트</h1>
          <h2 className="mt-6 text-center text-2xl font-bold">로그인</h2>
        </div>
        
        {error && (
          <div className="bg-error/10 text-error p-3 rounded-lg">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-success/10 text-success p-3 rounded-lg">
            {successMessage}
          </div>
        )}
        
        {!showEmailForm ? (
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

            <div className="divider text-xs text-gray-500">또는</div>

            <button
              onClick={() => setShowEmailForm(true)}
              className="btn btn-outline btn-primary gap-2"
            >
              <Envelope size={24} weight="bold" />
              이메일로 계속하기
            </button>
          </div>
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
          <div className="w-full max-w-xs mx-auto">
            <div className="tabs tabs-boxed mb-4 flex">
              <button 
                className={`tab flex-1 ${!password ? 'tab-active' : ''}`}
                onClick={() => setPassword('')}
              >
                이메일 링크
              </button>
              <button 
                className={`tab flex-1 ${password ? 'tab-active' : ''}`}
                onClick={() => setPassword(' ')}
              >
                비밀번호
              </button>
            </div>
            
            {!password ? (
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
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : '로그인 링크 받기'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="btn btn-ghost btn-sm w-full"
                >
                  돌아가기
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">이메일</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소를 입력하세요"
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
                    placeholder="비밀번호를 입력하세요"
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : '로그인'}
                </button>
                
                <div className="text-center text-sm">
                  계정이 없으신가요?{' '}
                  <Link href="/signup" className="text-primary hover:underline">
                    회원가입
                  </Link>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="btn btn-ghost btn-sm w-full"
                >
                  소셜 로그인으로 돌아가기
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 메인 로그인 페이지 컴포넌트
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
} 