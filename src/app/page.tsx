'use client';

import { useState, Suspense, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SearchForm from '@/components/SearchForm';
import FeatureSection from '@/components/FeatureSection';
import { useAuthModal } from '@/contexts/AuthModalContext';
import LoginModalTrigger from '@/components/LoginModalTrigger';
import { useToast } from '@/contexts/ToastContext';
import AILoadingState from '@/components/AILoadingState';
import PlaceCard from '@/components/PlaceCard';
import { Storefront, Plus } from '@phosphor-icons/react';
import AddPlaceButton from '@/components/AddPlaceButton';

interface PlaceData {
  id: string;
  place_id: string;
  place_name: string;
  place_address?: string;
  place_image_url?: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  content_last_changed_at?: string;
  copies_count: number;
  blog_reviews_count?: number;
  visitor_reviews_count?: number;
}

interface MyPlacesData {
  places: PlaceData[];
  profile: {
    max_places: number;
    used_places: number;
    subscription_tier: string;
  };
  change_info: {
    can_change_place: boolean;
    next_change_available_date: string | null;
  };
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const { showToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string> | null>(null);
  const [placesData, setPlacesData] = useState<MyPlacesData | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // 사용자 매장 정보 가져오기
  useEffect(() => {
    const fetchPlacesData = async () => {
      if (!user) return;
      
      try {
        setIsLoadingPlaces(true);
        const response = await fetch('/api/my-places');
        if (response.ok) {
          const data = await response.json();
          setPlacesData(data);
        }
      } catch (error) {
        console.error('매장 정보 가져오기 오류:', error);
      } finally {
        setIsLoadingPlaces(false);
      }
    };
    
    fetchPlacesData();
  }, [user]);

  // 매장 추가 버튼 클릭 핸들러
  const handleAddPlaceClick = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    
    // 매장 등록 한도 체크
    if (placesData && placesData.profile.used_places >= placesData.profile.max_places) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 5000); // 5초 후 경고 숨김
      showToast(`매장 등록 한도(${placesData.profile.max_places}개)에 도달했습니다. 기존 매장을 삭제하거나 플랜을 업그레이드하세요.`, 'warning');
      return;
    }
    
    setShowSearchForm(true);
  };

  // 검색 폼 취소 핸들러
  const handleCancelSearch = () => {
    setShowSearchForm(false);
  };

  const handleSearchSubmit = async (url: string) => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (!url.trim()) {
      showToast('URL을 입력해주세요.', 'error');
      return;
    }

    // 매장 등록 한도 체크 (중복 체크지만 혹시 모르니 남겨둠)
    if (placesData && placesData.profile.used_places >= placesData.profile.max_places) {
      showToast(`매장 등록 한도(${placesData.profile.max_places}개)에 도달했습니다. 기존 매장을 삭제하거나 플랜을 업그레이드하세요.`, 'warning');
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
      setShowSearchForm(false);
      router.push(`/p/${result.placeId}`);

    } catch (error) {
      console.error('API 호출 오류:', error);
      showToast('요청 처리 중 예기치 않은 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 매장 데이터 처리 - 이미지와 리뷰 정보 추출
  if (placesData?.places && Array.isArray(placesData.places)) {
    placesData.places = placesData.places.map((place: any) => {
      // 이미지와 리뷰 데이터 설정
      if (place.crawled_data?.basic_info) {
        const basicInfo = place.crawled_data.basic_info;
        
        // 대표 이미지 추출
        if (basicInfo.representative_images?.length > 0) {
          place.place_image_url = basicInfo.representative_images[0];
        }
        
        // 리뷰 정보 추출
        place.blog_reviews_count = basicInfo.blog_review_count || 0;
        place.visitor_reviews_count = basicInfo.visitor_review_count || 0;
      }
      
      return place;
    });
  }

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
        
        {/* 검색 폼이 표시될 때 */}
        {showSearchForm ? (
          <div className="mb-8">
            <SearchForm onSubmit={handleSearchSubmit} />
            <button 
              className="btn btn-ghost btn-sm mt-2"
              onClick={handleCancelSearch}
              disabled={isProcessing}
            >
              취소
            </button>
          </div>
        ) : !user ? (
          // 로그인하지 않은 상태일 때 검색 폼 보여주기
          <SearchForm onSubmit={handleSearchSubmit} />
        ) : null}
        
        {/* 로딩 표시 */}
        {isLoadingPlaces && user ? (
          <div className="flex justify-center items-center py-6">
            <span className="loading loading-spinner loading-md"></span>
            <span className="ml-2">매장 정보 불러오는 중...</span>
          </div>
        ) : null}
        
        {isProcessing && (
          <AILoadingState type="analysis" customMessage="매장 정보 분석 준비 중" />
        )}
        
        {/* 등록된 매장이 있는 경우 매장 목록 표시 */}
        {user && placesData && (
          <div className="max-w-4xl mx-auto mt-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">내 매장 목록</h2>
            </div>
            
            {placesData.places.length > 0 || (user && !isLoadingPlaces) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placesData.places.map(place => (
                  <PlaceCard 
                    key={place.id} 
                    place={place} 
                    showActions={false}
                    className="w-full"
                  />
                ))}
                
                {/* 매장 추가 버튼 카드 */}
                {user && !isLoadingPlaces && (
                  <AddPlaceButton 
                    onClick={handleAddPlaceClick}
                    canAddPlace={placesData ? placesData.profile.used_places < placesData.profile.max_places : true}
                    maxPlaces={placesData ? placesData.profile.max_places : 1}
                    usedPlaces={placesData ? placesData.profile.used_places : 0}
                  />
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-base-200 rounded-lg">
                <p className="text-base-content/70">등록된 매장이 없습니다.</p>
                <p className="text-sm mt-2">매장 추가하기 버튼을 눌러 매장을 등록해보세요.</p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <button 
                className="btn btn-primary"
                onClick={() => router.push('/my-places')}
              >
                내 매장 관리하기
              </button>
            </div>
          </div>
        )}
      </section>
      
      {/* 특징 섹션 */}
      <FeatureSection />
    </div>
  );
}
