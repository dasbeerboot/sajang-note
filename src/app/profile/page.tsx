'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, CreditCard, CheckCircle, XCircle } from '@phosphor-icons/react';

type SubscriptionStatus = 'active' | 'canceled' | 'none';

interface ProfileData {
  id: string;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  subscription_status: SubscriptionStatus;
  subscription_end_date: string | null;
  billing_id: string | null;
  subscription_tier: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  
  // 프로필 데이터 로드
  useEffect(() => {
    async function loadProfileData() {
      if (!user) return;
      
      try {
        setLoadingProfile(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, phone, phone_verified, subscription_status, subscription_end_date, billing_id, subscription_tier')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        setProfileData(data as ProfileData);
      } catch (error) {
        console.error('프로필 데이터 로드 오류:', error);
        showToast('프로필 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setLoadingProfile(false);
      }
    }
    
    if (user) {
      loadProfileData();
    }
  }, [user, showToast]);
  
  // 로그인하지 않은 경우 로그인 페이지로 리디렉션
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // 구독 취소 처리
  const handleCancelSubscription = async () => {
    if (!profileData?.billing_id) return;
    
    if (!confirm('정말로 구독을 취소하시겠습니까?')) return;
    
    try {
      // 인증 토큰 가져오기
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      // 서버에 구독 취소 요청
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          billing_id: profileData.billing_id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '구독 취소 중 오류가 발생했습니다.');
      }
      
      // 구독 상태 업데이트
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'canceled'
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      
      // 상태 업데이트
      setProfileData(prev => prev ? {
        ...prev,
        subscription_status: 'canceled'
      } : null);
      
      showToast('구독이 성공적으로 취소되었습니다.', 'success');
    } catch (error: any) {
      console.error('구독 취소 오류:', error);
      showToast(error.message || '구독 취소 중 오류가 발생했습니다.', 'error');
    }
  };
  
  if (loading || loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">내 프로필</h1>
        
        {/* 프로필 정보 */}
        <div className="bg-base-200 rounded-lg p-6 mb-8 shadow-md">
          <div className="flex items-center mb-6">
            {user?.user_metadata.avatar_url ? (
              <Image 
                src={user.user_metadata.avatar_url} 
                alt="프로필 이미지" 
                width={80} 
                height={80}
                className="rounded-full mr-4"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mr-4">
                <User size={40} weight="fill" className="text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{profileData?.full_name || user?.email}</h2>
              <p className="text-sm opacity-70">{user?.email}</p>
              {profileData?.phone && (
                <p className="text-sm mt-1 flex items-center">
                  {profileData.phone}
                  {profileData.phone_verified ? (
                    <span className="ml-2 text-success flex items-center">
                      <CheckCircle size={16} weight="fill" className="mr-1" /> 인증됨
                    </span>
                  ) : (
                    <span className="ml-2 text-error flex items-center">
                      <XCircle size={16} weight="fill" className="mr-1" /> 미인증
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* 구독 정보 */}
        <div className="bg-base-200 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <CreditCard size={24} className="mr-2" /> 구독 관리
          </h2>
          
          {profileData?.subscription_status === 'active' ? (
            <div>
              <div className="flex items-center mb-4">
                <div className="badge badge-success mr-2">활성</div>
                <p>현재 {profileData.subscription_tier === 'premium' ? 'Pro' : 'Basic'} 구독 중입니다.</p>
              </div>
              
              {profileData.subscription_end_date && (
                <p className="mb-4">
                  다음 결제일: {
                    profileData.subscription_end_date ? 
                    new Date(profileData.subscription_end_date).toISOString().split('T')[0] : 
                    '없음'
                  }
                </p>
              )}
              
              <button 
                onClick={handleCancelSubscription}
                className="btn btn-outline btn-error btn-sm"
              >
                구독 취소
              </button>
            </div>
          ) : profileData?.subscription_status === 'canceled' ? (
            <div>
              <div className="flex items-center mb-4">
                <div className="badge badge-warning mr-2">취소됨</div>
                <p>구독이 취소되었습니다.</p>
              </div>
              
              {profileData.subscription_end_date && (
                <p className="mb-4">
                  이용 기간: {new Date(profileData.subscription_end_date).toLocaleDateString()}까지
                </p>
              )}
              
              <button 
                onClick={() => setShowSubscribeModal(true)}
                className="btn btn-primary btn-sm"
              >
                다시 구독하기
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4">아직 구독 중이 아닙니다. 프리미엄 기능을 이용하려면 구독해주세요.</p>
              <button 
                onClick={() => setShowSubscribeModal(true)}
                className="btn btn-primary btn-sm"
              >
                구독하기
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* 구독 모달 */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-base-100 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">구독 플랜 선택</h3>
            
            <div className="space-y-4 mb-6">
              <div className="border rounded-lg p-4 cursor-pointer hover:border-primary">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold">Basic 플랜</h4>
                  <div className="badge badge-primary">추천</div>
                </div>
                <p className="text-xl font-bold mb-2">5,900원 <span className="text-sm font-normal">/ 월</span></p>
                <p className="text-sm mb-3 opacity-70">기본 기능 이용 가능</p>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                    <span className="text-sm">거래처 관리</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                    <span className="text-sm">기본 통계 기능</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                    <span className="text-sm">알림 서비스</span>
                  </li>
                </ul>
              </div>
              
              <div className="border rounded-lg p-4 cursor-pointer hover:border-primary bg-primary bg-opacity-5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold">Pro 플랜</h4>
                  <div className="badge badge-secondary">프리미엄</div>
                </div>
                <p className="text-xl font-bold mb-2">9,900원 <span className="text-sm font-normal">/ 월</span></p>
                <p className="text-sm mb-3 opacity-70">모든 프리미엄 기능 이용 가능</p>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                    <span className="text-sm">무제한 거래처 관리</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                    <span className="text-sm">고급 통계 기능</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                    <span className="text-sm">자동 알림 서비스</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle size={16} weight="fill" className="text-success mr-2" />
                    <span className="text-sm">우선 기술 지원</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button 
                onClick={() => setShowSubscribeModal(false)}
                className="btn btn-outline btn-sm"
              >
                취소
              </button>
              <button 
                onClick={() => router.push('/subscription/checkout')}
                className="btn btn-primary btn-sm"
              >
                결제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 