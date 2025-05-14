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
import AddPlaceButton from '@/components/AddPlaceButton';

// 타입 정의 추가
interface BasicInfo {
  representative_images?: string[];
  blog_review_count?: number;
  visitor_review_count?: number;
}

interface CrawledData {
  basic_info?: BasicInfo;
}

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
  crawled_data?: CrawledData; // CrawledData 타입으로 변경
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const { showToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [_generatedContent, setGeneratedContent] = useState<Record<string, string> | null>(null);
  const [placesData, setPlacesData] = useState<MyPlacesData | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [_showLimitWarning, setShowLimitWarning] = useState(false);

  useEffect(() => {
    const fetchPlacesData = async () => {
      if (!user) {
        setPlacesData(null);
        return;
      }
      setIsLoadingPlaces(true);
      try {
        const response = await fetch('/api/my-places');
        if (response.ok) {
          const data = await response.json();
          setPlacesData(data);
        } else {
          setPlacesData(null);
        }
      } catch (error) {
        console.error('매장 정보 가져오기 오류:', error);
        setPlacesData(null);
      } finally {
        setIsLoadingPlaces(false);
      }
    };

    if (!authLoading) {
      fetchPlacesData();
    }
  }, [user, authLoading, showToast]);

  const handleAddPlaceClick = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (placesData && placesData.profile.used_places >= placesData.profile.max_places) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 5000);
      showToast(
        `매장 등록 한도(${placesData.profile.max_places}개)에 도달했습니다. 기존 매장을 삭제하거나 플랜을 업그레이드하세요.`,
        'warning'
      );
      return;
    }
    setShowSearchForm(true);
  };

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
    if (placesData && placesData.profile.used_places >= placesData.profile.max_places) {
      showToast(
        `매장 등록 한도(${placesData.profile.max_places}개)에 도달했습니다. 기존 매장을 삭제하거나 플랜을 업그레이드하세요.`,
        'warning'
      );
      return;
    }
    setIsProcessing(true);
    setGeneratedContent(null);
    try {
      const response = await fetch('/api/places/register-or-get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (result.isGeminiApiError) {
        showToast(
          '일시적인 AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.',
          'warning'
        );
        setShowSearchForm(false);
        return;
      }
      showToast(
        result.message ||
          (result.isNew ? '매장이 등록되었습니다.' : '등록된 매장 정보를 가져왔습니다.'),
        'success'
      );
      setShowSearchForm(false);
      if (!authLoading && user) {
        setIsLoadingPlaces(true);
        const fetchUpdatedData = async () => {
          try {
            const res = await fetch('/api/my-places');
            if (res.ok) {
              const updatedData = await res.json();
              setPlacesData(updatedData);
            }
          } catch (e) {
            console.error('매장 정보 갱신 오류:', e);
          } finally {
            setIsLoadingPlaces(false);
          }
        };
        await fetchUpdatedData();
      }
      router.push(`/p/${result.placeId}`);
    } catch (error) {
      console.error('API 호출 오류:', error);
      showToast('요청 처리 중 예기치 않은 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const processedPlacesData =
    placesData?.places?.map((place: PlaceData) => {
      const updatedPlace = { ...place };
      if (place.crawled_data?.basic_info) {
        const basicInfo = place.crawled_data.basic_info;
        if (basicInfo.representative_images && basicInfo.representative_images.length > 0) {
          updatedPlace.place_image_url = basicInfo.representative_images[0];
        }
        updatedPlace.blog_reviews_count = basicInfo.blog_review_count || 0;
        updatedPlace.visitor_reviews_count = basicInfo.visitor_review_count || 0;
      }
      return updatedPlace;
    }) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={null}>
        <LoginModalTrigger />
      </Suspense>
      <section className="text-center py-20">
        <h1 className="text-5xl font-bold mb-2">
          사장노트{' '}
          <span className="text-2xl bg-gradient-to-r from-primary from-50% to-secondary to-50% bg-clip-text text-transparent">
            Beta
          </span>
        </h1>
        <p className="text-xl">
          <b>우리 매장 </b>당근 광고, 파워링크부터 쓰레드까지 <b>AI가 알아서</b>
        </p>
        <p className="text-xl mb-6">
          지금 <span className="text-primary font-bold">무료</span>로 사용해보세요
        </p>

        {(!user || showSearchForm) && (
          <div className="mb-8">
            <SearchForm onSubmit={handleSearchSubmit} />
            {showSearchForm && user && (
              <button
                className="btn btn-ghost btn-sm mt-2"
                onClick={handleCancelSearch}
                disabled={isProcessing}
              >
                취소
              </button>
            )}
          </div>
        )}

        {isProcessing && <AILoadingState type="analysis" customMessage="매장 정보 분석 준비 중" />}

        {user && isLoadingPlaces && (
          <div className="flex justify-center items-center py-6">
            <span className="loading loading-spinner loading-md"></span>
            <span className="ml-2">매장 정보 불러오는 중...</span>
          </div>
        )}

        {user && !isLoadingPlaces && placesData && (
          <div className="max-w-4xl mx-auto mt-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">내 매장 목록</h2>
            </div>

            {(processedPlacesData.length > 0 ||
              (user && !isLoadingPlaces && placesData.places.length === 0)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedPlacesData.map(place => (
                  <PlaceCard key={place.id} place={place} showActions={false} className="w-full" />
                ))}
                <AddPlaceButton
                  onClick={handleAddPlaceClick}
                  canAddPlace={
                    placesData
                      ? placesData.profile.used_places < placesData.profile.max_places
                      : true
                  }
                  maxPlaces={placesData ? placesData.profile.max_places : 1}
                  usedPlaces={placesData ? placesData.profile.used_places : 0}
                />
              </div>
            )}
            {user &&
              !isLoadingPlaces &&
              placesData &&
              placesData.places.length === 0 &&
              processedPlacesData.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AddPlaceButton
                    onClick={handleAddPlaceClick}
                    canAddPlace={placesData.profile.used_places < placesData.profile.max_places}
                    maxPlaces={placesData.profile.max_places}
                    usedPlaces={placesData.profile.used_places}
                  />
                </div>
              )}

            <div className="mt-6 text-center">
              <button className="btn btn-primary" onClick={() => router.push('/my-places')}>
                내 매장 관리하기
              </button>
            </div>
          </div>
        )}
      </section>

      <FeatureSection />
    </div>
  );
}
