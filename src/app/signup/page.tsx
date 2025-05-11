'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { CheckCircle } from '@phosphor-icons/react';

export default function SignupPage() {
  const { showToast } = useToast();
  
  // Step 1: 기본 정보 입력
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Step 2: 전화번호 인증
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false); // 전화번호 인증 API 호출 중 로딩 상태
  const [phoneVerified, setPhoneVerified] = useState(false); // 전화번호 인증 완료 여부
  const [isAttemptingFinalSignup, setIsAttemptingFinalSignup] = useState(false); // 최종 가입 시도 상태

  const [loading, setLoading] = useState(false); // 전체 회원가입 처리 중 로딩 상태
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: 정보 입력, 2: 전화번호 인증, 3: 완료

  const handleSendVerification = async () => {
    if (!phone || !/^01([0|1|6|7|8|9])([0-9]{3,4})([0-9]{4})$/.test(phone.replace(/-/g, ''))) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsVerifyingPhone(true);
    setError(null);
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/-/g, ''), isSignup: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '인증번호 발송에 실패했습니다.');
      setCodeSent(true);
      showToast('인증번호가 발송되었습니다.', 'info');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '인증번호 발송 중 알 수 없는 오류가 발생했습니다.';
      setError(message);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // 최종 회원가입 로직 (useCallback으로 메모이제이션)
  const handleFinalSignup = useCallback(async () => {
    console.log('[handleFinalSignup] Called. phoneVerified:', phoneVerified, 'isAttemptingFinalSignup:', isAttemptingFinalSignup);

    if (!phoneVerified) {
      console.error('[handleFinalSignup_ERROR] Phone not verified, aborting signup.');
      setError('휴대폰 인증을 먼저 완료해주세요. (내부 오류)');
      setIsAttemptingFinalSignup(false); 
      return;
    }

    console.log('[handleFinalSignup] Proceeding with signup. User details:', { name, email, phone_raw: phone });
    setLoading(true); 
    setError(null);
    try {
      const cleanedPhone = phone.replace(/-/g, '');
      const { data: signUpResponse, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { // 이 정보가 NEW.raw_user_meta_data로 전달되어 트리거가 사용합니다.
            full_name: name, 
            phone: cleanedPhone,
            phone_verified: true, // 전화번호 인증 완료
            user_status: 'pending'  // 이메일 인증 대기 상태
          },
          // emailRedirectTo: `${window.location.origin}/auth/confirm` // 필요하다면 이메일 인증 후 리디렉션 URL 지정
        }
      });

      if (signUpError) {
        console.error('[handleFinalSignup_ERROR] Supabase signUp error:', signUpError);
        throw signUpError;
      }

      if (!signUpResponse.user) { 
        console.error('[handleFinalSignup_ERROR] User object is null after signUp.');
        throw new Error('회원가입 후 사용자 정보를 받지 못했습니다.');
      }
      
      console.log('[handleFinalSignup] supabase.auth.signUp successful for user:', signUpResponse.user.id);
      // profiles 테이블에 대한 직접적인 upsert/update 로직은 이제 트리거가 담당하므로 제거합니다.

      setStep(3);
      showToast('회원가입 요청이 완료되었습니다. 이메일을 확인해주세요.', 'success');

    } catch (error: unknown) {
      console.error('[handleFinalSignup_CATCH_ERROR] Catch block error:', error);
      const message = error instanceof Error ? error.message : '회원가입 중 알 수 없는 오류가 발생했습니다.';
      setError(message);
    } finally {
      console.log('[handleFinalSignup] Finally block. Setting loading and isAttemptingFinalSignup to false.');
      setLoading(false);
      setIsAttemptingFinalSignup(false);
    }
  }, [email, password, name, phone, phoneVerified, showToast, setLoading, setError, setStep, isAttemptingFinalSignup]);

  const handleVerifyCodeAndProceed = async () => {
    if (verificationCode.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }
    setIsVerifyingPhone(true);
    setError(null);

    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/-/g, ''), code: verificationCode, isSignup: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '인증번호가 올바르지 않습니다.');
      
      showToast('휴대폰 인증이 완료되었습니다.', 'success');
      setPhoneVerified(true); // 전화번호 인증 성공 상태 설정
      setIsAttemptingFinalSignup(true); // 최종 가입 시도 상태 설정 -> useEffect 발동

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '인증번호 확인 중 알 수 없는 오류가 발생했습니다.';
      setError(message);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // phoneVerified와 isAttemptingFinalSignup 상태가 변경되면 최종 가입 시도
  useEffect(() => {
    console.log('[useEffect_FinalSignup] Detected state change. phoneVerified:', phoneVerified, 'isAttemptingFinalSignup:', isAttemptingFinalSignup);
    if (phoneVerified && isAttemptingFinalSignup) {
      console.log('[useEffect_FinalSignup] Conditions met, calling handleFinalSignup.');
      handleFinalSignup();
    } else {
      console.log('[useEffect_FinalSignup] Conditions NOT met, not calling handleFinalSignup.');
    }
  }, [phoneVerified, isAttemptingFinalSignup, handleFinalSignup]);

  const handlePrimarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      // 기본 정보 입력 완료, 전화번호 인증 단계로 이동
      if (!name || !email || !password || !phone) {
        setError('모든 정보를 입력해주세요.');
        return;
      }
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return;
      }
      setStep(2); // 전화번호 인증 단계로
      handleSendVerification(); // 자동으로 인증번호 발송
    } else if (step === 2 && codeSent && !phoneVerified) {
      // 인증번호 입력 후 확인 단계
      await handleVerifyCodeAndProceed();
    }
    // phoneVerified가 true가 되면 handleFinalSignup이 호출됨
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-base-100">
      <div className="w-full max-w-md space-y-6 bg-base-200 p-8 rounded-xl shadow-xl">
        <div>
          <Link href="/" className="flex justify-center mb-6">
            {/* 로고 SVG 또는 Image 컴포넌트 추가 가능 */}
            <h1 className="text-3xl font-bold text-center text-primary">사장노트</h1>
          </Link>
          <h2 className="text-center text-xl font-semibold text-gray-700">
            {step === 1 && '가입 정보 입력'}
            {step === 2 && '휴대폰 인증'}
            {step === 3 && '회원가입 완료'}
          </h2>
        </div>
        
        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}
        
        {step === 1 && (
          <form onSubmit={handlePrimarySubmit} className="space-y-4">
            {/* 이름, 이메일, 비밀번호, 휴대폰 번호 입력 필드는 기존과 유사하게 유지 */}
            <div>
              <label htmlFor="name" className="label">
                <span className="label-text">이름</span>
              </label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input input-bordered w-full" required />
            </div>
            <div>
              <label htmlFor="email" className="label">
                <span className="label-text">이메일</span>
              </label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input input-bordered w-full" required />
            </div>
            <div>
              <label htmlFor="password" className="label">
                <span className="label-text">비밀번호 (6자 이상)</span>
              </label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input input-bordered w-full" required minLength={6} />
            </div>
            <div>
              <label htmlFor="phone" className="label">
                <span className="label-text">휴대폰 번호 (&apos;-&apos; 없이 입력)</span>
              </label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered w-full" required pattern="01[016789][0-9]{7,8}" placeholder="01012345678" />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading || isVerifyingPhone}>
              {isVerifyingPhone ? '처리 중...' : (loading ? '가입 처리 중...' : '다음 (휴대폰 인증)')}
            </button>
            <div className="text-center text-sm">
              이미 계정이 있으신가요? <Link href="/?openLoginModal=true" className="link link-primary">로그인</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handlePrimarySubmit} className="space-y-4">
            <p className="text-sm text-center">
              {phone} (으)로 발송된 6자리 인증번호를 입력해주세요.
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">인증번호</span>
              </label>
              <input id="code" type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered w-full" required maxLength={6} placeholder="6자리 숫자" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleSendVerification} className="btn btn-outline flex-1" disabled={isVerifyingPhone}>
                {isVerifyingPhone ? '발송 중...' : '재발송'}
              </button>
              <button type="submit" className="btn btn-primary flex-1" disabled={isVerifyingPhone || verificationCode.length !== 6 || phoneVerified}>
                {isVerifyingPhone ? '확인 중...' : '인증 확인'}
              </button>
            </div>
            <button type="button" onClick={() => { setStep(1); setError(null); setCodeSent(false); setPhoneVerified(false); setIsAttemptingFinalSignup(false);}} className="btn btn-ghost btn-sm w-full">
              &larr; 이전 단계로
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle size={48} weight="fill" className="text-success mx-auto" />
            <h3 className="font-semibold text-lg">회원가입 요청 완료!</h3>
            <p className="text-sm">
              입력하신 이메일 주소 <span className="font-medium text-primary">{email}</span>로<br/>계정 활성화 링크를 보냈습니다.
            </p>
            <p className="text-xs opacity-70">
              이메일을 받지 못하셨다면 스팸함도 확인해주세요.
            </p>
            <Link href="/" className="btn btn-primary w-full">
              홈 화면으로 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 