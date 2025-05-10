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

  // 구독 페이지로 이동
  const handleSubscribe = () => {
    router.push('/subscription/checkout');
  };
  
  if (loading || loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">내 프로필</h1>
      
      {/* 프로필 정보 */}
      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body">
          <h2 className="card-title">
            <User size={20} className="mr-2" />
            기본 정보
          </h2>
          
          <div className="flex items-center mt-2">
            {user?.user_metadata.avatar_url ? (
              <Image 
                src={user.user_metadata.avatar_url} 
                alt="프로필 이미지" 
                width={80} 
                height={80}
                className="rounded-full mr-4"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mr-4">
                <User size={32} weight="fill" className="text-white" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold">{profileData?.full_name || user?.email}</h3>
              <p className="text-sm opacity-70">{user?.email}</p>
              {profileData?.phone && (
                <p className="text-sm mt-1 flex items-center">
                  {profileData.phone}
                  {profileData.phone_verified ? (
                    <span className="ml-2 text-success flex items-center text-xs">
                      <CheckCircle size={14} weight="fill" className="mr-1" /> 인증됨
                    </span>
                  ) : (
                    <span className="ml-2 text-error flex items-center text-xs">
                      <XCircle size={14} weight="fill" className="mr-1" /> 미인증
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 구독 정보 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title flex items-center">
            <CreditCard size={20} className="mr-2" /> 
            구독 관리
          </h2>
          
          {profileData?.subscription_status === 'active' ? (
            <div className="py-2">
              <div className="flex items-center justify-between border border-gray-300 p-3 rounded-lg mb-4">
                <div className="flex items-center">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="font-medium">{profileData.subscription_tier === 'premium' ? 'Pro' : 'Basic'} 플랜</span>
                      <span className="text-xs ml-2 text-green-600">활성</span>
                    </div>
                    {profileData.subscription_end_date && (
                      <span className="text-xs opacity-70 mt-1">
                        다음 결제일: {new Date(profileData.subscription_end_date).toISOString().split('T')[0]}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleCancelSubscription}
                  className="btn btn-outline btn-sm btn-error"
                >
                  구독 취소
                </button>
              </div>
              
              <div className="text-sm opacity-70">
                <p>구독을 취소하면 다음 결제일부터 구독이 해지됩니다. 취소 후에도 결제 기간 만료일까지는 서비스를 계속 이용할 수 있습니다.</p>
              </div>
            </div>
          ) : profileData?.subscription_status === 'canceled' ? (
            <div className="py-2">
              <div className="flex items-center justify-between border border-gray-300 p-3 rounded-lg mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <span className="font-medium">{profileData.subscription_tier === 'premium' ? 'Pro' : 'Basic'} 플랜</span>
                    <span className="text-xs ml-2 text-yellow-600">취소됨</span>
                  </div>
                  {profileData.subscription_end_date && (
                    <span className="text-xs opacity-70 mt-1">
                      이용 기간: {new Date(profileData.subscription_end_date).toISOString().split('T')[0]}까지
                    </span>
                  )}
                </div>
                <button 
                  onClick={handleSubscribe}
                  className="btn btn-primary btn-sm"
                >
                  다시 구독하기
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <div className="p-4 border border-gray-300 rounded-lg bg-base-200 mb-4">
                <p className="mb-3">아직 구독 중이 아닙니다. 프리미엄 기능을 이용하려면 구독해주세요.</p>
                <button 
                  onClick={handleSubscribe}
                  className="btn btn-primary"
                >
                  구독하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 