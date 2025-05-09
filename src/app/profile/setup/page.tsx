'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  // 이미 인증된 사용자는 홈으로 리다이렉트
  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!authLoading && user) {
        // 프로필 정보 가져오기
        const { data } = await supabase
          .from('profiles')
          .select('phone_verified, full_name')
          .eq('id', user.id)
          .single();
        
        if (data && data.phone_verified) {
          // 이미 인증 완료된 사용자는 홈으로
          router.push('/');
        } else if (data && data.full_name) {
          // 이름이 이미 설정되어 있으면 폼에 채우기
          setFullName(data.full_name);
        }
      } else if (!authLoading && !user) {
        // 로그인하지 않은 사용자는 로그인 페이지로
        router.push('/login');
      }
    };
    
    checkProfileStatus();
  }, [user, authLoading, router]);
  
  // 카운트다운 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  const formatPhone = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 전화번호 형식으로 포맷팅 (010-1234-5678)
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };
  
  const handleSendVerificationCode = async () => {
    // 전화번호 유효성 검사
    const phoneRegex = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    if (!phoneRegex.test(phone)) {
      setError('유효한 전화번호를 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phone.replace(/-/g, ''), isSignup: true }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '인증번호 발송에 실패했습니다.');
      }
      
      setCodeSent(true);
      setCountdown(180); // 3분 타이머
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '인증번호 발송 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone.replace(/-/g, ''),
          code: verificationCode,
          isSignup: true
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '인증번호 확인에 실패했습니다.');
      }
      
      // 인증 성공 시 프로필 정보 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          phone: phone.replace(/-/g, ''),
          phone_verified: true,
          user_status: 'active'
        })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
      setVerified(true);
      showToast('휴대폰 인증이 완료되었습니다.', 'success');
      
      // 인증 완료 후 자동으로 홈으로 이동
      router.push('/');
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : '인증번호 확인 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-base-200 p-8 rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center">사장노트</h1>
          <p className="mt-2 text-center text-sm">
            서비스 이용을 위해 이름과 전화번호를 입력해주세요.
          </p>
        </div>
        
        {error && (
          <div className="bg-error/10 text-error p-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium">
              이름
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="이름을 입력해주세요"
              required
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium">
              휴대폰 번호
            </label>
            <div className="flex gap-2">
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={handlePhoneChange}
                className="input input-bordered flex-1"
                placeholder="010-0000-0000"
                required
                disabled={verified || codeSent}
              />
              {!verified && !codeSent && (
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  className="btn btn-primary"
                  disabled={loading || phone.length < 12}
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : '인증번호 받기'}
                </button>
              )}
            </div>
          </div>
          
          {codeSent && !verified && (
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium">
                인증번호 {countdown > 0 && `(${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')})`}
              </label>
              <div className="flex gap-2">
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  className="input input-bordered flex-1"
                  placeholder="6자리 인증번호"
                  required
                  maxLength={6}
                  disabled={verified}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  className="btn btn-primary"
                  disabled={loading || verificationCode.length !== 6 || countdown === 0}
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : '확인'}
                </button>
              </div>
              <div className="flex justify-between mt-2">
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  className="btn btn-ghost btn-xs"
                  disabled={loading || countdown > 0}
                >
                  인증번호 재발송
                </button>
                {countdown === 0 && (
                  <span className="text-error text-xs">인증번호가 만료되었습니다. 재발송해주세요.</span>
                )}
              </div>
            </div>
          )}
          
          {verified && (
            <div className="bg-success/10 text-success p-3 rounded-lg text-center">
              휴대폰 인증이 완료되었습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 