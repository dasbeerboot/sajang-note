'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '@phosphor-icons/react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/contexts/AuthContext';
import CreditInfoTooltip from '@/components/CreditInfoTooltip';

// Supabase 클라이언트를 컴포넌트 외부에서 생성
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserCreditsProps {
  className?: string;
  onCreditsChange?: (credits: number) => void;
}

export default function UserCredits({ className = '', onCreditsChange }: UserCreditsProps) {
  const [creditInfoOpen, setCreditInfoOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [localCredits, setLocalCredits] = useState<number | null>(null);
  const { profile } = useAuth();

  // DB에서 직접 크레딧 값을 가져와 로컬 상태 업데이트 - useCallback으로 메모이제이션
  const fetchAndUpdateCredits = useCallback(async () => {
    try {
      // 사용자 ID가 없으면 무시
      if (!profile?.id) {
        return;
      }

      // DB에서 크레딧 직접 조회
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', profile.id)
        .single();

      if (error) {
        return;
      }

      if (data) {
        const credits = data.credits || 0;
        setLocalCredits(credits);

        // 부모 컴포넌트에 크레딧 변경 알림 (필요한 경우)
        if (onCreditsChange) {
          onCreditsChange(credits);
        }
      }
    } catch (_err) {
      // 에러 발생 시 조용히 처리
    }
  }, [profile?.id, onCreditsChange]);

  // AuthContext에서 profile이 변경되면 크레딧 값도 업데이트
  useEffect(() => {
    if (profile?.credits !== undefined && profile.credits !== null) {
      setLocalCredits(profile.credits);

      if (onCreditsChange) {
        onCreditsChange(profile.credits);
      }
    } else if (profile?.id) {
      fetchAndUpdateCredits();
    }
  }, [profile, fetchAndUpdateCredits, onCreditsChange]);

  // 컴포넌트 마운트 시 크레딧 조회
  useEffect(() => {
    if (profile?.id) {
      fetchAndUpdateCredits();
    }
  }, [fetchAndUpdateCredits, profile?.id]);

  // 페이지 포커스 시 크레딧 갱신
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile?.id) {
        fetchAndUpdateCredits();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAndUpdateCredits, profile?.id]);

  // 크레딧 정보 아이콘 클릭 핸들러
  const handleCreditInfoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
    });
    setCreditInfoOpen(!creditInfoOpen);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <span className="text-sm font-medium text-gray-700 mr-1">
        남은 크레딧: {localCredits !== null ? localCredits : '로드 중...'}
      </span>
      <button
        onClick={handleCreditInfoClick}
        className="text-gray-500 hover:text-blue-600 transition-colors"
        aria-label="크레딧 정보"
      >
        <Question size={16} />
      </button>
      <CreditInfoTooltip
        isOpen={creditInfoOpen}
        onClose={() => setCreditInfoOpen(false)}
        position={tooltipPosition}
      />
    </div>
  );
}
