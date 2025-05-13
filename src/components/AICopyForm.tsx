'use client';

import React, { useState, useEffect } from 'react';
import { Chat, Lightning, Note } from '@phosphor-icons/react';

interface CopyMenuItem {
  id: string;
  label: string;
}

interface AICopyFormProps {
  onSubmit: (userPrompt: string) => void;
  isGenerating: boolean;
  copyType: string;
  items: CopyMenuItem[];
}

export default function AICopyForm({ onSubmit, isGenerating, copyType, items }: AICopyFormProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [concept, setConcept] = useState('');
  const [keyword, setKeyword] = useState('');
  const [wordCount, setWordCount] = useState('');
  const [extraRequest, setExtraRequest] = useState('');
  const [keywordError, setKeywordError] = useState(false);
  const [wordCountError, setWordCountError] = useState(false);
  const [wordCountExceededError, setWordCountExceededError] = useState(false);

  // copyType이 변경될 때 상태 초기화
  useEffect(() => {
    // 모든 상태 초기화
    setUserPrompt('');
    setConcept('');
    setKeyword('');
    setWordCount('');
    setExtraRequest('');
    setKeywordError(false);
    setWordCountError(false);
    setWordCountExceededError(false);

    // 블로그 리뷰 포스팅이면 입력 폼 표시, 아니면 초기 선택 화면으로
    if (copyType === 'blog_review_post') {
      setShowPromptForm(true);
    } else {
      setShowPromptForm(false);
    }
  }, [copyType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 블로그 리뷰 포스팅인 경우 키워드 필수 체크 및 특별한 형식으로 요청
    if (copyType === 'blog_review_post') {
      let hasError = false;

      // 키워드 유효성 검사
      if (!keyword.trim()) {
        setKeywordError(true);
        hasError = true;
      }

      // 글자 수 유효성 검사
      if (!wordCount) {
        setWordCountError(true);
        hasError = true;
      } else if (parseInt(wordCount) > 3000) {
        setWordCountExceededError(true);
        hasError = true;
      }

      if (hasError) {
        return;
      }

      setKeywordError(false);
      setWordCountError(false);
      setWordCountExceededError(false);

      const formattedPrompt = `컨셉: ${concept}\n키워드: ${keyword}\n글자 수: ${wordCount}자\n요청사항 기타: ${extraRequest}`;
      onSubmit(formattedPrompt);
    } else {
      onSubmit(userPrompt);
    }
  };

  const handleQuickGenerate = () => {
    onSubmit(''); // 빈 문자열로 요청하면 기본 생성
  };

  // copyType에 해당하는 레이블 찾기
  const getCopyTypeLabel = () => {
    const menuItem = items.find(item => item.id === copyType);
    return menuItem ? menuItem.label : copyType;
  };

  // 숫자만 입력 가능하게 하는 함수
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 숫자만 허용
    if (value === '' || /^[0-9\b]+$/.test(value)) {
      setWordCount(value);
      setWordCountError(false);

      // 3000 초과 검사
      if (value && parseInt(value) > 3000) {
        setWordCountExceededError(true);
      } else {
        setWordCountExceededError(false);
      }
    }
  };

  // 키워드 입력 시 에러 초기화
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    if (e.target.value.trim()) {
      setKeywordError(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-md mb-6 animate-fadeIn">
      <div className="card-body">
        <h3 className="card-title text-base font-bold flex items-center mb-3">
          <Chat size={18} className="mr-2" />
          {getCopyTypeLabel()} 생성하기
        </h3>

        {!showPromptForm && copyType !== 'blog_review_post' ? (
          <div className="flex flex-col gap-3">
            <div className="bg-base-100 p-4 rounded-lg">
              <p className="text-sm mb-4">이 메뉴에 대한 AI 카피를 어떻게 생성할까요?</p>

              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={handleQuickGenerate}
                  className="btn btn-primary btn-sm justify-start"
                  disabled={isGenerating}
                >
                  <Lightning size={18} weight="fill" />
                  바로 생성하기
                </button>

                <button
                  onClick={() => setShowPromptForm(true)}
                  className="btn bg-base-100 border-gray-300 hover:bg-gray-200 hover:border-none text-base-content btn-sm justify-start"
                  disabled={isGenerating}
                >
                  <Note size={18} className="text-primary" />
                  추가 요청사항이 있어요
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {copyType === 'blog_review_post' ? (
              // 블로그 리뷰 포스팅용 특수 폼
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">컨셉</span>
                  </label>
                  <input
                    type="text"
                    value={concept}
                    onChange={e => setConcept(e.target.value)}
                    className="input input-bordered w-full focus:input-primary"
                    placeholder="30대 여자"
                    disabled={isGenerating}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      키워드 <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={handleKeywordChange}
                    className={`input input-bordered w-full focus:input-primary ${keywordError ? 'input-error' : ''}`}
                    placeholder="청라 카페"
                    disabled={isGenerating}
                  />
                  {keywordError && (
                    <div className="text-error text-xs mt-1">키워드는 필수 입력 항목입니다.</div>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      글자 수 <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={wordCount}
                    onChange={handleNumberInput}
                    className={`input input-bordered w-full focus:input-primary ${wordCountError || wordCountExceededError ? 'input-error' : ''}`}
                    placeholder="2000"
                    disabled={isGenerating}
                  />
                  {wordCountError && (
                    <div className="text-error text-xs mt-1">글자 수는 필수 입력 항목입니다.</div>
                  )}
                  {wordCountExceededError && (
                    <div className="text-error text-xs mt-1">
                      글자 수는 최대 3000자까지 입력 가능합니다.
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">요청사항 (기타)</span>
                  </label>
                  <textarea
                    value={extraRequest}
                    onChange={e => setExtraRequest(e.target.value)}
                    className="textarea textarea-bordered w-full focus:textarea-primary"
                    placeholder="이모티콘 빼주세요"
                    disabled={isGenerating}
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              // 기본 폼
              <div className="form-control">
                <label className="label">
                  <span className="label-text">딱 한 줄로, 우리 가게를 표현한다면?</span>
                </label>
                <textarea
                  value={userPrompt}
                  onChange={e => setUserPrompt(e.target.value)}
                  className="textarea w-full focus:textarea-primary my-2"
                  placeholder="매장의 특장점이나 사장님의 장사 스토리를 간략히 써주시면, 카피 생성에 참고할게요."
                  disabled={isGenerating}
                  rows={3}
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-between mt-4">
              {copyType !== 'blog_review_post' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowPromptForm(false)}
                  disabled={isGenerating}
                >
                  뒤로가기
                </button>
              )}
              {copyType === 'blog_review_post' && (
                <div></div> // 블로그 리뷰 포스팅에서는 뒤로가기 버튼 대신 빈 공간
              )}
              <button type="submit" className="btn btn-primary btn-sm" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2"></span>
                    생성 중...
                  </>
                ) : (
                  '생성하기'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// 다른 컴포넌트에서 사용할 수 있도록 함수 내보내기
export const getCopyTypeLabel = (copyType: string, items: CopyMenuItem[]) => {
  const menuItem = items.find(item => item.id === copyType);
  return menuItem ? menuItem.label : copyType;
};
