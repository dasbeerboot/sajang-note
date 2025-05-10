'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CreditCard, CheckCircle, XCircle } from '@phosphor-icons/react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
}

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const [cardInfo, setCardInfo] = useState({
    cardNo: '',
    expYear: '',
    expMonth: '',
    idNo: '',
    cardPw: ''
  });
  
  const [hasRegisteredCard, setHasRegisteredCard] = useState(false);
  const [cardDetails, setCardDetails] = useState<{card_name?: string, card_number?: string} | null>(null);
  
  // 구독 플랜 로드
  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlans(true);
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('active', true)
          .order('price', { ascending: true });
          
        if (error) throw error;
        
        setPlans(data as SubscriptionPlan[]);
        
        // 기본 플랜 선택
        if (data && data.length > 0) {
          setSelectedPlan(data[0].id);
        }
      } catch (error) {
        console.error('구독 플랜 로드 오류:', error);
        showToast('구독 플랜 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setLoadingPlans(false);
      }
    }
    
    loadPlans();
  }, [showToast]);
  
  // 사용자 카드 정보 확인
  useEffect(() => {
    async function checkCardInfo() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('billing_id, card_info')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data?.billing_id) {
          setHasRegisteredCard(true);
          setCardDetails(data.card_info);
        }
      } catch (error) {
        console.error('카드 정보 확인 오류:', error);
      }
    }
    
    if (user) {
      checkCardInfo();
    }
  }, [user]);
  
  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // 카드 정보 입력 핸들러
  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 카드 등록 처리
  const handleRegisterCard = async () => {
    try {
      setProcessingPayment(true);
      
      // 카드 정보 유효성 검사
      if (!cardInfo.cardNo || !cardInfo.expYear || !cardInfo.expMonth || !cardInfo.idNo || !cardInfo.cardPw) {
        showToast('모든 카드 정보를 입력해주세요.', 'error');
        setProcessingPayment(false);
        return;
      }
      
      // 카드번호 유효성 검사
      if (!/^\d{15,16}$/.test(cardInfo.cardNo)) {
        showToast('유효한 카드번호를 입력해주세요.', 'error');
        setProcessingPayment(false);
        return;
      }
      
      // 유효기간 유효성 검사
      if (!/^\d{2}$/.test(cardInfo.expYear) || !/^\d{2}$/.test(cardInfo.expMonth)) {
        showToast('유효기간을 정확히 입력해주세요.', 'error');
        setProcessingPayment(false);
        return;
      }
      
      // 생년월일/사업자번호 유효성 검사
      if (!/^\d{6,10}$/.test(cardInfo.idNo)) {
        showToast('생년월일(YYMMDD) 또는 사업자번호를 정확히 입력해주세요.', 'error');
        setProcessingPayment(false);
        return;
      }
      
      // 비밀번호 유효성 검사
      if (!/^\d{2}$/.test(cardInfo.cardPw)) {
        showToast('카드 비밀번호 앞 2자리를 입력해주세요.', 'error');
        setProcessingPayment(false);
        return;
      }
      
      // 사용자 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('인증 토큰을 가져올 수 없습니다.');
      }
      
      // 카드 등록 API 호출
      const response = await fetch('/api/subscription/register-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(cardInfo),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || '카드 등록에 실패했습니다.');
      }
      
      setHasRegisteredCard(true);
      setCardDetails({
        card_name: data.cardName,
        card_number: data.cardNo
      });
      
      showToast('카드가 성공적으로 등록되었습니다.', 'success');
    } catch (error: any) {
      console.error('카드 등록 오류:', error);
      showToast(error.message || '카드 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };
  
  // 구독 시작 처리
  const handleStartSubscription = async () => {
    if (!selectedPlan) {
      showToast('구독 플랜을 선택해주세요.', 'error');
      return;
    }
    
    if (!hasRegisteredCard) {
      showToast('먼저 카드를 등록해주세요.', 'error');
      return;
    }
    
    try {
      setProcessingPayment(true);
      
      // 사용자 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('인증 토큰을 가져올 수 없습니다.');
      }
      
      // 구독 시작 API 호출
      const response = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          planId: selectedPlan
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || '구독 시작에 실패했습니다.');
      }
      
      showToast('구독이 성공적으로 시작되었습니다.', 'success');
      
      // 프로필 페이지로 리디렉션
      router.push('/profile');
    } catch (error: any) {
      console.error('구독 시작 오류:', error);
      showToast(error.message || '구독 시작 중 오류가 발생했습니다.', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };
  
  if (loading || loadingPlans) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">구독 신청</h1>
        
        {/* 구독 플랜 선택 */}
        <div className="bg-base-200 rounded-lg p-6 mb-8 shadow-md">
          <h2 className="text-xl font-bold mb-4">구독 플랜 선택</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlan === plan.id 
                    ? 'border-primary bg-primary bg-opacity-10' 
                    : 'border-base-300 hover:border-primary'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="form-control">
                    <input 
                      type="radio" 
                      name="plan" 
                      className="radio radio-primary" 
                      checked={selectedPlan === plan.id}
                      onChange={() => setSelectedPlan(plan.id)}
                    />
                  </div>
                </div>
                
                <p className="text-2xl font-bold mb-2">
                  {plan.price.toLocaleString()}원
                  <span className="text-sm font-normal ml-1">
                    / {plan.interval === 'monthly' ? '월' : '년'}
                  </span>
                </p>
                
                <p className="text-sm mb-3 opacity-70">{plan.description}</p>
                
                <ul className="space-y-2">
                  {plan.features && plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* 카드 정보 입력 */}
        <div className="bg-base-200 rounded-lg p-6 mb-8 shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <CreditCard size={24} className="mr-2" /> 결제 정보
          </h2>
          
          {hasRegisteredCard ? (
            <div>
              <div className="flex items-center mb-4">
                <div className="badge badge-success mr-2">등록됨</div>
                <p>카드가 등록되었습니다.</p>
              </div>
              
              {cardDetails && (
                <div className="p-4 border rounded-lg bg-base-100">
                  <p className="font-bold">{cardDetails.card_name}</p>
                  <p>{cardDetails.card_number}</p>
                </div>
              )}
              
              <div className="mt-4">
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => setHasRegisteredCard(false)}
                >
                  다른 카드로 변경
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">카드번호</span>
                  </label>
                  <input
                    type="text"
                    name="cardNo"
                    placeholder="카드번호 (숫자만 입력)"
                    className="input input-bordered"
                    value={cardInfo.cardNo}
                    onChange={handleCardInputChange}
                    maxLength={16}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">유효기간(년)</span>
                    </label>
                    <input
                      type="text"
                      name="expYear"
                      placeholder="YY"
                      className="input input-bordered"
                      value={cardInfo.expYear}
                      onChange={handleCardInputChange}
                      maxLength={2}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">유효기간(월)</span>
                    </label>
                    <input
                      type="text"
                      name="expMonth"
                      placeholder="MM"
                      className="input input-bordered"
                      value={cardInfo.expMonth}
                      onChange={handleCardInputChange}
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">생년월일 또는 사업자번호</span>
                  </label>
                  <input
                    type="text"
                    name="idNo"
                    placeholder="생년월일(YYMMDD) 또는 사업자번호"
                    className="input input-bordered"
                    value={cardInfo.idNo}
                    onChange={handleCardInputChange}
                    maxLength={10}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">카드 비밀번호 앞 2자리</span>
                  </label>
                  <input
                    type="password"
                    name="cardPw"
                    placeholder="**"
                    className="input input-bordered"
                    value={cardInfo.cardPw}
                    onChange={handleCardInputChange}
                    maxLength={2}
                  />
                </div>
              </div>
              
              <button 
                className={`btn btn-primary ${processingPayment ? 'loading' : ''}`}
                onClick={handleRegisterCard}
                disabled={processingPayment}
              >
                카드 등록
              </button>
            </div>
          )}
        </div>
        
        {/* 구독 시작 버튼 */}
        <div className="flex justify-between items-center">
          <button 
            className="btn btn-outline"
            onClick={() => router.push('/profile')}
            disabled={processingPayment}
          >
            취소
          </button>
          
          <button 
            className={`btn btn-primary ${processingPayment ? 'loading' : ''}`}
            onClick={handleStartSubscription}
            disabled={!hasRegisteredCard || !selectedPlan || processingPayment}
          >
            구독 시작하기
          </button>
        </div>
      </div>
    </div>
  );
} 