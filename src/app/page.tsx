'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SearchForm from '@/components/SearchForm';
import FeatureSection from '@/components/FeatureSection';
import LoginModal from '@/components/LoginModal';

export default function Home() {
  const { user } = useAuth();
  const loginModalRef = useRef<HTMLDialogElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    carrotTitle: string;
    carrotContent: string;
    powerlink: string;
    placeDesc: string;
    threadPost: string;
  } | null>(null);

  const handleSearchSubmit = async () => {
    // 로그인 상태 확인
    if (!user) {
      // 로그인되지 않은 경우 로그인 모달 표시
      loginModalRef.current?.showModal();
      return;
    }
    
    // 로그인된 경우 콘텐츠 생성 진행
    setIsGenerating(true);
    
    // 생성 시간을 시뮬레이션하기 위한 타임아웃
    setTimeout(() => {
      setIsGenerating(false);
      
      // 샘플 생성 콘텐츠
      setGeneratedContent({
        carrotTitle: "우리동네 커피 맛집, 오늘 방문하면 아메리카노 1+1!",
        carrotContent: "안녕하세요 이웃님들! 저희 카페가 오픈 1주년을 맞이했어요. 오늘 방문하시는 모든 분들께 아메리카노 1+1 이벤트를 진행합니다. 특별히 준비한 수제 쿠키도 무료로 드려요! 많은 관심 부탁드립니다.",
        powerlink: "우리동네 커피 맛집 | 오픈 1주년 기념 이벤트 | 아메리카노 1+1 행사중",
        placeDesc: "편안한 분위기에서 즐기는 프리미엄 원두 커피. 수제 디저트와 함께 특별한 시간을 선사합니다. 매장 내 무료 와이파이, 콘센트 완비.",
        threadPost: "☕️ 오픈 1주년을 맞이한 저희 카페에서 특별한 이벤트를 준비했습니다!\n\n✨ 아메리카노 1+1\n✨ 수제 쿠키 무료 증정\n✨ 멤버십 가입 시 추가 할인\n\n오늘 하루만 진행되는 이벤트, 놓치지 마세요! 여러분의 방문을 기다립니다. #카페 #이벤트 #커피맛집"
      });
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 히어로 섹션 */}
      <section className="text-center py-20">
        <h1 className="text-5xl font-bold mb-2">
          사장노트 <span className="text-2xl bg-gradient-to-r from-primary from-50% to-secondary to-50% bg-clip-text text-transparent">Beta</span>
        </h1>
        <p className="text-xl mb-6"><b>우리 매장 </b>당근 광고, 파워링크부터 쓰레드까지 <b>AI가 알아서</b></p>
        
        {/* 소셜프루프 배지 */}
        {/* <SocialProofBadge /> */}
        
        {/* 검색 폼 */}
        <SearchForm onSubmit={handleSearchSubmit} />
        
        {/* 로딩 표시 */}
        {isGenerating && (
          <div className="mt-8 flex flex-col items-center">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-2">콘텐츠 생성 중...</p>
          </div>
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
      
      {/* 로그인 모달 */}
      <LoginModal modalId="login_modal" modalRef={loginModalRef} />
    </div>
  );
}
