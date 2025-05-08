'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: 기본 정보, 2: 전화번호 인증
  const [codeSent, setCodeSent] = useState(false);
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 회원가입 처리
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
            phone_verified: false
          }
        }
      });
      
      if (error) throw error;
      
      // 회원가입 성공 후 인증 단계로 이동
      setStep(2);
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendVerification = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, isSignup: true })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '인증번호 발송에 실패했습니다.');
      }
      
      setCodeSent(true);
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '인증번호 발송 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: verificationCode, isSignup: true })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '인증번호 확인에 실패했습니다.');
      }
      
      // 인증 성공 시 로그인 페이지로 이동
      router.push('/login?verified=true');
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '인증번호 확인 중 오류가 발생했습니다.';
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
          <h2 className="mt-6 text-center text-2xl font-bold">
            {step === 1 ? '회원가입' : '휴대폰 인증'}
          </h2>
        </div>
        
        {error && (
          <div className="bg-error/10 text-error p-3 rounded-lg">
            {error}
          </div>
        )}
        
        {step === 1 ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                이름
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                휴대폰 번호 (- 없이 입력)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input input-bordered w-full"
                required
                pattern="[0-9]{10,11}"
                placeholder="01012345678"
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? '처리 중...' : '회원가입'}
              </button>
            </div>
            
            <div className="text-center text-sm">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-4">
                {phone}번으로 인증번호를 발송합니다.
              </p>
              
              {!codeSent ? (
                <button
                  onClick={handleSendVerification}
                  className="btn btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? '발송 중...' : '인증번호 발송'}
                </button>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium">
                      인증번호
                    </label>
                    <input
                      id="code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="input input-bordered w-full"
                      required
                      pattern="[0-9]{6}"
                      placeholder="6자리 숫자"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      className="btn btn-outline flex-1"
                      disabled={loading}
                    >
                      재발송
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1"
                      disabled={loading}
                    >
                      {loading ? '확인 중...' : '확인'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 