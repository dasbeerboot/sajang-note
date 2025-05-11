'use client';

import React, { useState } from 'react';

interface AICopyFormProps {
  onSubmit: (userPrompt: string) => void;
  isGenerating: boolean;
  copyType: string;
}

export default function AICopyForm({ onSubmit, isGenerating, copyType }: AICopyFormProps) {
  const [userPrompt, setUserPrompt] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(userPrompt);
  };
  
  return (
    <form onSubmit={handleSubmit} className="mt-6 p-4 bg-base-200 rounded-lg animate-fadeIn">
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">
          추가 요청사항이 있으신가요?
        </label>
        <textarea 
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          className="textarea textarea-bordered w-full" 
          placeholder="원하는 내용, 강조할 점, 특별한 요구사항 등을 자유롭게 작성해주세요."
          disabled={isGenerating}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end mt-2">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="loading loading-spinner loading-xs mr-2"></span>
              생성 중...
            </>
          ) : `${getCopyTypeLabel(copyType)} 생성하기`}
        </button>
      </div>
    </form>
  );
}

// 카피 타입에 따른 라벨 반환
export function getCopyTypeLabel(copyType: string): string {
  const typeLabelMap: Record<string, string> = {
    'danggn_title': '당근 광고 제목',
    'danggn_post': '당근 가게 소식',
    'powerlink_ad': '파워링크 광고',
    'naver_place_description': '플레이스 소개글'
  };
  
  return typeLabelMap[copyType] || '카피';
} 