'use client';

import React from 'react';
import { getCopyTypeLabel } from './AICopyForm';

interface AICopyDisplayProps {
  content: string;
  copyType: string;
  onNewCopy: () => void;
  isSaved: boolean;
}

export default function AICopyDisplay({ 
  content, 
  copyType, 
  onNewCopy,
  isSaved
}: AICopyDisplayProps) {
  // 대괄호로 감싸진 텍스트를 볼드체로 변환하는 함수
  const formatContent = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // [텍스트] 패턴 찾기
    const regex = /\[([^\]]+)\]/g;
    let match;
    
    // content가 없거나 문자열이 아니면 그대로 반환
    if (!content || typeof content !== 'string') {
      return content;
    }
    
    while ((match = regex.exec(content)) !== null) {
      // 이전 텍스트 추가
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // 대괄호 안의 텍스트를 볼드로 추가
      parts.push(
        <strong key={match.index} className="text-primary-focus">
          {match[0]}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // 남은 텍스트 추가
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts;
  };
  
  return (
    <div className="mt-6 p-4 border border-base-300 rounded-md bg-base-100 shadow-lg animate-fadeIn">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">
          {getCopyTypeLabel(copyType)} {isSaved && '(저장됨)'}
        </h3>
        {isSaved && (
          <button 
            onClick={onNewCopy}
            className="btn btn-sm btn-outline"
          >
            새로 만들기
          </button>
        )}
      </div>
      
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-sm bg-base-200 p-3 rounded-md">
          {formatContent()}
        </pre>
      </div>
      
      <div className="flex justify-end mt-4 gap-2">
        <button 
          onClick={() => navigator.clipboard.writeText(content)}
          className="btn btn-sm btn-outline"
        >
          복사하기
        </button>
      </div>
    </div>
  );
} 