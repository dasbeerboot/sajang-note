'use client';

import React, { useState, useEffect } from 'react';
import { CircleNotch, Brain, Sparkle, Coffee, Robot, LightbulbFilament } from '@phosphor-icons/react';

interface AILoadingStateProps {
  type: 'analysis' | 'copy'; // analysis: 매장 분석 중, copy: 카피 생성 중
  customMessage?: string;
}

const analysisMessages = [
  "AI가 매장 정보를 분석하고 있어요",
  "매장의 특징을 파악하고 있어요",
  "메뉴와 리뷰를 살펴보고 있어요",
  "맛과 분위기를 이해하고 있어요",
  "사장님만의 특별함을 찾고 있어요",
  "곧 분석이 완료될 거예요"
];

const copyMessages = [
  "AI가 마케팅 카피를 작성하고 있어요",
  "가장 매력적인 표현을 찾고 있어요",
  "고객의 마음을 사로잡을 문구를 고민중이에요",
  "사장님 매장만의 특별함을 담고 있어요",
  "주문하고 싶게 만드는 문구를 생각중이에요",
  "작품 같은 카피를 만들고 있어요"
];

export default function AILoadingState({ type, customMessage }: AILoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = type === 'analysis' ? analysisMessages : copyMessages;
  
  // 메시지 순환 효과
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000); // 3초마다 메시지 변경
    
    return () => clearInterval(timer);
  }, [messages]);
  
  // 아이콘 선택
  const getIcon = () => {
    const icons = [Brain, Sparkle, LightbulbFilament, Robot];
    const Icon = icons[messageIndex % icons.length];
    return <Icon size={28} weight="duotone" className="text-primary" />;
  };
  
  return (
    <div className="fixed inset-0 bg-base-300/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fadeIn">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <CircleNotch size={60} weight="bold" className="text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              {getIcon()}
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">
            {customMessage || (type === 'analysis' ? '맞춤형 매장 분석 중' : '매력적인 카피 생성 중')}
          </h3>
          
          <p className="text-base-content/80 mb-4">
            {messages[messageIndex]}
          </p>
          
          <div className="flex justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '600ms' }} />
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-base-content/60">
            <Coffee size={14} />
            <span>좋은 결과를 위해 잠시만 기다려주세요</span>
          </div>
        </div>
      </div>
    </div>
  );
} 