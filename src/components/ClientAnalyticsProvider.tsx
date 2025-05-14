'use client';

import { useEffect } from 'react';
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

  // 사용자 식별 정보 설정
  useEffect(() => {
    if (user?.id && profile) {
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
    }
  }, [user?.id, profile]);

  // 페이지 뷰 추적
  useEffect(() => {
    if (!pathname) return;
    
    // 현재 URL로 페이지 뷰 이벤트 추적
    analytics.trackEvent(Events.PAGE_VIEW, {
      page: pathname,
      user_id: user?.id,
      subscription_tier: profile?.subscription_tier,
    });
  }, [pathname, user?.id, profile?.subscription_tier]);

  // 자식 컴포넌트 렌더링 (UI에 영향 없음)
  return <>{children}</>;
} 