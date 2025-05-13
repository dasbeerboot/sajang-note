'use client';

import React from 'react';
import { Check, Copy, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';

interface CopyMenuItem {
  id: string;
  label: string;
}

interface AICopyDisplayProps {
  content: string;
  copyType: string;
  onNewCopy: () => void;
  isSaved: boolean;
  items: CopyMenuItem[];
}

export default function AICopyDisplay({
  content,
  copyType,
  onNewCopy,
  isSaved,
  items,
}: AICopyDisplayProps) {
  const [copied, setCopied] = useState(false);

  // copyType에 해당하는 레이블 찾기
  const getCopyTypeLabel = () => {
    const menuItem = items.find(item => item.id === copyType);
    return menuItem ? menuItem.label : copyType;
  };

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
        <strong key={match.index} className="text-primary">
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

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card bg-base-100 shadow-md mb-6 animate-fadeIn">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="card-title text-base font-bold">
            {getCopyTypeLabel()}
            {isSaved && <span className="badge badge-sm badge-primary ml-2">저장됨</span>}
          </h3>
          {isSaved && (
            <button onClick={onNewCopy} className="btn btn-ghost btn-sm" title="새로 만들기">
              <PencilSimple size={18} />
              <span className="ml-1 hidden sm:inline">새로 만들기</span>
            </button>
          )}
        </div>

        <div className="border border-base-300 rounded-lg p-4 bg-base-100/50 mb-3">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{formatContent()}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCopy}
            className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline'}`}
          >
            {copied ? (
              <>
                <Check size={16} weight="bold" />
                <span className="ml-1">복사 완료</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span className="ml-1">복사하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
