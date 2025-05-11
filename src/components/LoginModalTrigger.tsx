'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthModal } from '@/contexts/AuthModalContext';

export default function LoginModalTrigger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    if (searchParams.get('openLoginModal') === 'true') {
      openAuthModal();
      // URL에서 쿼리 파라미터를 제거하여 뒤로 가기 시 모달이 다시 뜨는 것을 방지
      const nextURL = new URL(window.location.href);
      nextURL.searchParams.delete('openLoginModal');
      router.replace(nextURL.pathname + nextURL.search, { scroll: false });
    }
  }, [searchParams, openAuthModal, router]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않습니다.
} 