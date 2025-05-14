import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type FeatureType = 'ai_copy' | 'blog';

export function useCredits() {
  const { profile, setProfile } = useAuth();
  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deductCredits = async (feature: FeatureType) => {
    setIsDeducting(true);
    setError(null);

    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '크레딧 차감에 실패했습니다');
      }

      // 로컬 상태 업데이트
      if (profile) {
        setProfile({
          ...profile,
          credits: data.remaining_credits,
        });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(errorMessage);
      return false;
    } finally {
      setIsDeducting(false);
    }
  };

  return {
    credits: profile?.credits || 0,
    isDeducting,
    error,
    deductCredits,
    hasEnoughCredits: (feature: FeatureType) => {
      const required = feature === 'blog' ? 2 : 1;
      return (profile?.credits || 0) >= required;
    },
  };
}
