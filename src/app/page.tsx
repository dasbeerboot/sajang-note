'use client';

import { useState, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SearchForm from '@/components/SearchForm';
import FeatureSection from '@/components/FeatureSection';
import { useAuthModal } from '@/contexts/AuthModalContext';
import LoginModalTrigger from '@/components/LoginModalTrigger';
import { useToast } from '@/contexts/ToastContext';
import AILoadingState from '@/components/AILoadingState';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const { showToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string> | null>(null);

  const handleSearchSubmit = async (url: string) => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (!url.trim()) {
      showToast('URL을 입력해주세요.', 'error');
      return;
    }

    setIsProcessing(true);
    setGeneratedContent(null);

    try {
      const response = await fetch('/api/places/register-or-get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || '매장 정보 처리 중 오류가 발생했습니다.', 'error');
        if (result.errorCode === 'LIMIT_EXCEEDED') {
          console.warn('매장 등록 한도 초과');
        }
        return;
      }

      showToast(result.message || (result.isNew ? '매장이 등록되었습니다.' : '등록된 매장 정보를 가져왔습니다.'), 'success');
      
      router.push(`/p/${result.placeId}`);

    } catch (error) {
      console.error('API 호출 오류:', error);
      showToast('요청 처리 중 예기치 않은 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={null}>
        <LoginModalTrigger />
      </Suspense>
      {/* 히어로 섹션 */}
      <section className="text-center py-20">
        <h1 className="text-5xl font-bold mb-2">
          사장노트 <span className="text-2xl bg-gradient-to-r from-primary from-50% to-secondary to-50% bg-clip-text text-transparent">Beta</span>
        </h1>
        <p className="text-xl"><b>우리 매장 </b>당근 광고, 파워링크부터 쓰레드까지 <b>AI가 알아서</b></p>
        <p className="text-xl mb-6">지금 <span className="text-primary font-bold">무료</span>로 사용해보세요</p>
        
        {/* 소셜프루프 배지 */}
        {/* <SocialProofBadge /> */}
        
        {/* 검색 폼 */}
        <SearchForm onSubmit={handleSearchSubmit} />
        
        {/* 로딩 표시 */}
        {isProcessing && (
          <AILoadingState type="analysis" customMessage="매장 정보 분석 준비 중" />
        )}
      </section>
      
      {/* 생성된 콘텐츠 결과 섹션 */}
      {generatedContent && (
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">생성된 콘텐츠</h2>
          <div className="grid grid-cols-1 gap-8">
            {/* 당근 광고 */}
            <div className="bg-base-200 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">당근 광고</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body">
                    <h3 className="card-title flex items-center">
                      <span className="badge badge-primary mr-2">제목</span>
                    </h3>
                    <p>{generatedContent.carrotTitle}</p>
                  </div>
                </div>
                
                <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h3 className="card-title flex items-center">
                      <span className="badge badge-primary mr-2">내용</span>
                    </h3>
                    <p>{generatedContent.carrotContent}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 파워링크 & 플레이스 & 쓰레드 */}
            <div className="grid grid-cols-1 gap-4">
              {/* 파워링크 */}
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h3 className="card-title flex items-center">
                    <span className="badge badge-primary mr-2">파워링크</span>
                  </h3>
                  <p>{generatedContent.powerlink}</p>
                </div>
              </div>
              
              {/* 플레이스 문구 */}
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <h3 className="card-title flex items-center">
                    <span className="badge badge-primary mr-2">플레이스 문구</span>
                  </h3>
                  <p>{generatedContent.placeDesc}</p>
                </div>
              </div>
              
              {/* 쓰레드 포스팅 */}
              <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
                  <h3 className="card-title flex items-center">
                    <span className="badge badge-primary mr-2">쓰레드 포스팅</span>
                  </h3>
                  <p className="whitespace-pre-line">{generatedContent.threadPost}</p>
              </div>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* 특징 섹션 */}
      <FeatureSection />
    </div>
  );
}
