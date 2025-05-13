'use client';

import React, { useState } from 'react';
import { Chat } from '@phosphor-icons/react';

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
    <div className="card bg-base-100 shadow-md mb-6 animate-fadeIn">
      <div className="card-body">
        <h3 className="card-title text-base font-bold flex items-center mb-3">
          <Chat size={18} className="mr-2" />
          {getCopyTypeLabel(copyType)} 생성하기
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">딱 한 줄로, 우리 가게를 표현한다면?</span>
            </label>
            <textarea 
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="textarea textarea-bordered w-full focus:textarea-primary my-2" 
              placeholder="매장의 특장점이나 사장님의 장사 스토리를 간략히 써주시면, 카피 생성에 참고할게요."
              disabled={isGenerating}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end mt-2">
            <button 
              type="submit" 
              className="btn btn-primary btn-sm"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                  생성 중...
                </>
              ) : '생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 카피 타입에 따른 라벨 반환
export function getCopyTypeLabel(copyType: string): string {
  const typeLabelMap: Record<string, string> = {
    'danggn_title': '당근 광고 제목',
    'danggn_post': '당근 가게 소식',
    'powerlink_ad': '네이버 파워링크 광고문구',
    'naver_place_description': '네이버 플레이스 광고문구',
    'instagram_post': '인스타(메타) 포스팅'
  };
  
  return typeLabelMap[copyType] || '카피';
} 