'use client';

import React, { useEffect, useRef } from 'react';

interface CreditInfoTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function CreditInfoTooltip({ isOpen, onClose, position }: CreditInfoTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 w-72 bg-white shadow-lg rounded-md p-4 text-sm"
      style={{
        top: `${position.y + 20}px`,
        left: `${position.x - 200}px`,
      }}
    >
      <h3 className="font-bold text-gray-800 mb-2">크레딧 안내</h3>
      <p className="text-gray-600 mb-2">
        크레딧은 AI 콘텐츠를 생성할 때 사용됩니다:
      </p>
      <ul className="list-disc pl-5 mb-2 text-gray-600">
        <li>일반 카피: 1 크레딧</li>
        <li>블로그 콘텐츠: 2 크레딧</li>
      </ul>
      <p className="text-gray-600 mb-1">
        매일 자정에 구독 등급에 따라 크레딧이 충전됩니다:
      </p>
      <ul className="list-disc pl-5 text-gray-600">
        <li>베이직 구독: 20 크레딧/일</li>
        <li>프로 구독: 60 크레딧/일</li>
      </ul>
    </div>
  );
} 