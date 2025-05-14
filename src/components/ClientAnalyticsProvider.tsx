'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import analytics, { Events } from '@/lib/analytics';

/**
 * 사용자 정보 및 페이지 이벤트를 추적하는 클라이언트 컴포넌트
 * AuthProvider 내부에서 사용되어야 합니다.
 */
export default function ClientAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [isAnalyticsReady, setIsAnalyticsReady] = useState(false);
  
  // 중복 호출 방지를 위한 Ref
  const userIdentified = useRef<boolean>(false);
  const lastPathTracked = useRef<string | null>(null);

  // 초기화 상태 확인
  useEffect(() => {
    // process.env.NODE_ENV가 production인지 확인
    const isProd = process.env.NODE_ENV === 'production';
    // 토큰이 설정되어 있는지 확인
    const hasToken = !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    
    if (isProd) {
      if (hasToken) {
        setIsAnalyticsReady(true);
        console.info('[ClientAnalyticsProvider] Analytics ready');
      } else {
        console.warn('[ClientAnalyticsProvider] Mixpanel token not found in production environment');
      }
    } else {
      console.info('[ClientAnalyticsProvider] Development mode - analytics events will be logged to console only');
      setIsAnalyticsReady(true);
    }
  }, []);

  // 사용자 식별 정보 설정 - 세션당 한 번만 실행
  useEffect(() => {
    if (!isAnalyticsReady || !user?.id || !profile || userIdentified.current) return;
    
    try {
      // 사용자 ID 설정
      analytics.identify(user.id);
      
      // 사용자 정보 설정
      analytics.setUserProfile({
        $name: profile.full_name,
        $email: profile.email,
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        phone: profile.phone,
        credits: profile.credits,
      });
      
      // 식별 완료 표시
      userIdentified.current = true;
      console.info('[ClientAnalyticsProvider] User identified once:', user.id);
    } catch (error) {
      console.error('[ClientAnalyticsProvider] Error setting user identity:', error);
    }
  }, [user?.id, profile, isAnalyticsReady]);

  // 로그아웃 시 식별 플래그 초기화
  useEffect(() => {
    if (!user) {
      userIdentified.current = false;
    }
  }, [user]);

  // 페이지 뷰 추적 - 경로 변경 시에만 실행
  useEffect(() => {
    if (!isAnalyticsReady || !pathname || pathname === lastPathTracked.current) return;
    
    try {
      // 현재 URL로 페이지 뷰 이벤트 추적
      analytics.trackEvent(Events.PAGE_VIEW, {
        page: pathname,
        user_id: user?.id,
        subscription_tier: profile?.subscription_tier,
      });
      
      // 마지막 추적 경로 업데이트
      lastPathTracked.current = pathname;
    } catch (error) {
      console.error('[ClientAnalyticsProvider] Error tracking page view:', error);
    }
  }, [pathname, user?.id, profile?.subscription_tier, isAnalyticsReady]);

  // 자식 컴포넌트 렌더링 (UI에 영향 없음)
  return <>{children}</>;
} 