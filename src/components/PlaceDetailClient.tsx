'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import PlaceSummarySection from '@/components/PlaceSummarySection';
import AICopyButtonList from '@/components/AICopyButtonList';
import AICopyForm from '@/components/AICopyForm';
import AICopyDisplay from '@/components/AICopyDisplay';
import { MagicWand } from '@phosphor-icons/react';
import Link from 'next/link';
import AILoadingState from '@/components/AILoadingState';

interface PlaceData { 
  id: string;
  user_id: string; 
  place_id: string; 
  place_name?: string;
  place_address?: string;
  place_url?: string;
  status?: 'completed' | 'processing' | 'failed';
  crawled_data?: Record<string, unknown>; 
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  last_crawled_at?: string | null;
  content_last_changed_at?: string | null;
}

interface CopyMenuItem {
  id: string; 
  label: string; 
}

interface PlaceDetailClientProps {
  placeId: string;
  initialPlaceData?: PlaceData;
  initialError?: string;
}

type UserType = {
  id: string;
  [key: string]: unknown;
};

const aiCopyMenuItemsData: CopyMenuItem[] = [
  { id: 'danggn_title', label: '당근 광고 제목' },
  { id: 'danggn_post', label: '당근 가게 소식' },
  { id: 'powerlink_ad', label: '네이버 파워링크' },
  { id: 'naver_place_description', label: '플레이스 소개글' },
];

export default function PlaceDetailClient({ 
  placeId, 
  initialPlaceData,
  initialError 
}: PlaceDetailClientProps) {
  const [placeData, setPlaceData] = useState<PlaceData | null>(initialPlaceData || null);
  const [isLoadingPage, setIsLoadingPage] = useState(!initialPlaceData);
  const [errorPage, setErrorPage] = useState<string | null>(initialError || null);
  const [user, setUser] = useState<UserType | null>(null);

  // AI 카피 관련 상태
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [savedMenuIds, setSavedMenuIds] = useState<string[]>([]);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
  const [showNewCopyModal, setShowNewCopyModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 저장된 카피 로드 함수
  const loadSavedCopies = useCallback(async (placeId: string) => {
    const { data, error } = await supabase
      .from('ai_generated_copies')
      .select('copy_type, generated_content')
      .eq('place_id', placeId);
      
    if (error) {
      console.error('저장된 카피 로드 오류:', error);
      return;
    }
    
    // 저장된 메뉴 ID 목록 업데이트
    if (data && data.length > 0) {
      const savedIds = data.map(item => item.copy_type);
      setSavedMenuIds(savedIds);
      
      // localStorage에도 저장 (오프라인 접근용)
      for (const item of data) {
        localStorage.setItem(`copy_${placeId}_${item.copy_type}`, item.generated_content);
      }
    }
  }, [supabase, setSavedMenuIds]);

  useEffect(() => {
    async function fetchData() {
      if (initialPlaceData) {
        // 이미 서버에서 데이터를 전달받은 경우는 추가 로딩이 필요 없음
        return;
      }

      setIsLoadingPage(true);
      setErrorPage(null);

      // 사용자 세션 확인
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser as UserType | null);

      if (!currentUser) {
        setErrorPage('로그인이 필요합니다.');
        setIsLoadingPage(false);
        return;
      }

      // 매장 정보 가져오기
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('id', placeId)
        .single();

      if (error) {
        console.error(`[PlaceDetailClient] 매장 정보 조회 실패:`, error?.message);
        setErrorPage('매장 정보를 불러오는 데 실패했습니다.');
        setIsLoadingPage(false);
        return;
      }
      
      if (!data) {
        console.error(`[PlaceDetailClient] 매장 정보 조회 실패: 데이터 없음`);
        setErrorPage('해당 매장 정보를 찾을 수 없습니다.');
        setIsLoadingPage(false);
        return;
      }
      
      // 권한 검사
      if (data.user_id !== currentUser.id) {
        console.warn(`[PlaceDetailClient] 접근 권한 없음. 요청: ${currentUser.id}, 소유자: ${data.user_id}`);
        setErrorPage('이 매장에 대한 접근 권한이 없습니다.');
        setIsLoadingPage(false);
        return;
      }

      setPlaceData(data as PlaceData);
      setIsLoadingPage(false);
    }

    fetchData();
  }, [placeId, supabase, initialPlaceData]);

  // 사용자 정보 로드
  useEffect(() => {
    async function loadUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser as UserType | null);
    }
    
    if (!user) {
      loadUser();
    }
  }, [supabase, user]);

  // 저장된 카피 로드
  useEffect(() => {
    if (placeData) {
      loadSavedCopies(placeData.id);
    }
  }, [placeData, loadSavedCopies]);

  // 메뉴 선택 처리
  const handleSelectMenu = async (copyType: string) => {
    setActiveMenuId(copyType);
    
    // 이미 저장된 카피가 있는지 확인
    if (savedMenuIds.includes(copyType)) {
      // 저장된 카피 불러오기
      const savedCopy = localStorage.getItem(`copy_${placeData?.id}_${copyType}`);
      if (savedCopy) {
        setGeneratedCopy(savedCopy);
        return;
      }
      
      // localStorage에 없으면 DB에서 다시 조회
      const { data, error } = await supabase
        .from('ai_generated_copies')
        .select('generated_content, user_prompt')
        .eq('place_id', placeData?.id)
        .eq('copy_type', copyType)
        .single();
        
      if (!error && data) {
        setGeneratedCopy(data.generated_content);
      } else {
        // 에러 발생 시 저장된 목록에서 제거
        setSavedMenuIds(prev => prev.filter(id => id !== copyType));
        setGeneratedCopy(null);
      }
    } else {
      // 저장된 카피가 없으면 초기화
      setGeneratedCopy(null);
    }
  };

  // 카피 생성 처리
  const handleGenerateCopy = async (userPromptValue: string) => {
    if (!placeData || !activeMenuId) return;
    
    setIsGeneratingCopy(true);
    setGeneratedCopy(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-copy', {
        body: { 
          placeId: placeData.id,
          copyType: activeMenuId,
          userPrompt: userPromptValue || null
        }
      });

      if (error) {
        alert('카피 생성 중 오류가 발생했습니다: ' + error.message);
        setGeneratedCopy('오류: ' + error.message);
      } else if (data && typeof data.generatedCopy === 'string') {
        const generatedContent = data.generatedCopy;
        setGeneratedCopy(generatedContent);
        
        // 생성된 카피 저장
        await saveCopy(placeData.id, activeMenuId, userPromptValue, generatedContent);
        
        // 저장된 메뉴 목록 업데이트
        if (!savedMenuIds.includes(activeMenuId)) {
          setSavedMenuIds(prev => [...prev, activeMenuId]);
        }
        
        // localStorage에도 저장
        localStorage.setItem(`copy_${placeData.id}_${activeMenuId}`, generatedContent);
      } else {
        setGeneratedCopy('알 수 없는 응답 형식입니다.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '알 수 없는 에러가 발생했습니다';
      alert('카피 생성 중 예외가 발생했습니다: ' + errorMsg);
      setGeneratedCopy('예외: ' + errorMsg);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // 카피 저장 함수
  const saveCopy = async (placeId: string, copyType: string, userPrompt: string, content: string) => {
    const { error } = await supabase
      .from('ai_generated_copies')
      .upsert({
        place_id: placeId,
        user_id: user?.id,
        copy_type: copyType,
        user_prompt: userPrompt,
        generated_content: content,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'place_id,copy_type'
      });
      
    if (error) {
      console.error('카피 저장 오류:', error);
    }
  };

  // 새 카피 생성 모달 함수
  const handleNewCopyClick = () => {
    setShowNewCopyModal(true);
  };

  // 새 카피 생성 확인 함수
  const handleConfirmNewCopy = () => {
    setGeneratedCopy(null);
    setShowNewCopyModal(false);
  };

  if (isLoadingPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <AILoadingState type="analysis" customMessage="매장 정보 불러오는 중" />
      </div>
    );
  }

  if (errorPage) {
    // 에러 종류에 따라 다른 UI (로그인 필요, 권한 없음, 데이터 없음 등) 표시
    let alertType = 'alert-error';
    if (errorPage.includes('로그인')) alertType = 'alert-warning';

    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <div role="alert" className={`alert ${alertType} max-w-lg shadow-md`}>
          {errorPage.includes('로그인') ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          <div>
            <h3 className="font-bold">{errorPage.includes('로그인') ? '로그인 필요' : errorPage.includes('권한 없음') ? '접근 권한 없음' : '오류'}</h3>
            <div className="text-xs">{errorPage}</div>
          </div>
        </div>
        <Link href="/" className="btn btn-primary mt-4">홈으로 돌아가기</Link>
      </div>
    );
  }

  if (!placeData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="alert alert-error">매장 정보를 찾을 수 없습니다.</div>
      </div>
    );
  }

  // 상태별 UI 렌더링 (placeData가 있을 때)
  if (placeData.status === 'processing') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-xl font-semibold mb-3">{placeData.place_name || '매장 정보'} 처리 중...</h1>
        <AILoadingState type="analysis" />
      </div>
    );
  }

  if (placeData.status === 'failed') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <div role="alert" className="alert alert-error max-w-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold">매장 정보 처리 실패</h3>
            <div className="text-xs break-all">오류: {placeData.error_message || '알 수 없는 오류.'}</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-center max-w-md text-base-content/80">정보 수집/분석 중 문제가 발생했습니다. &apos;My 플레이스&apos;에서 삭제 후 다시 시도하거나 지원팀에 문의해주세요.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <span className="mr-2">{placeData.place_name}</span>
        <span className="text-sm font-normal text-base-content/60">
          {placeData.place_address?.split(' ').slice(-1)[0]}
        </span>
      </h1>
      
      <PlaceSummarySection placeData={placeData} />
      
      <div className="mt-8 mb-4">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <MagicWand size={20} className="mr-2" />
          AI로 만드는 진짜 팔리는 광고 카피
        </h2>
        <p className="text-sm text-base-content/70 mb-6">
          매장 정보를 기반으로 AI가 다양한 마케팅 카피를 생성해 드립니다. 당근마켓, 네이버 등 다양한 플랫폼에 활용해보세요.
        </p>
      </div>
      
      <AICopyButtonList 
        items={aiCopyMenuItemsData} 
        onSelectMenu={handleSelectMenu}
        activeMenuId={activeMenuId}
        savedMenuIds={savedMenuIds}
        isLoading={isGeneratingCopy}
      />
      
      {activeMenuId && !generatedCopy && !isGeneratingCopy && (
        <AICopyForm 
          onSubmit={handleGenerateCopy}
          isGenerating={isGeneratingCopy}
          copyType={activeMenuId}
        />
      )}
      
      {generatedCopy && activeMenuId && (
        <AICopyDisplay 
          content={generatedCopy}
          copyType={activeMenuId}
          onNewCopy={handleNewCopyClick}
          isSaved={savedMenuIds.includes(activeMenuId)}
        />
      )}
      
      {/* 새로 만들기 확인 모달 */}
      {showNewCopyModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">카피를 새로 만드시겠습니까?</h3>
            <p className="py-4">이전에 생성된 카피가 삭제됩니다. 계속하시겠습니까?</p>
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={() => setShowNewCopyModal(false)}
              >
                돌아가기
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleConfirmNewCopy}
              >
                새로 만들기
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowNewCopyModal(false)}></div>
        </div>
      )}
      
      {/* AI 카피 생성 중 로딩 인디케이터 */}
      {isGeneratingCopy && <AILoadingState type="copy" />}
    </div>
  );
} 