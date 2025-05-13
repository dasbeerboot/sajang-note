'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  PencilSimple,
  Trash,
  ClockCounterClockwise,
  Warning,
} from '@phosphor-icons/react';
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

// 타입 정의
interface PlaceData {
  id: string;
  place_id: string;
  place_name: string;
  place_address?: string;
  place_url?: string;
  place_image_url?: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  content_last_changed_at?: string;
  copies_count: number;
  blog_reviews_count?: number;
  visitor_reviews_count?: number;
  crawled_data?: CrawledData; // CrawledData 타입으로 변경
}

interface ProfileData {
  max_places: number;
  used_places: number;
  subscription_tier: string;
  next_place_change_date: string;
}

interface ChangeInfo {
  can_change_place: boolean;
  next_change_available_date: string | null;
  has_wildcard_available: boolean;
  remaining_place_changes: number;
}

interface MyPlacesData {
  places: PlaceData[];
  profile: ProfileData;
  change_info: ChangeInfo;
}

export default function MyPlacesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<MyPlacesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 데이터 가져오기
  const fetchData = async () => {
    if (loading) {
      return null; // 아직 인증 상태 로딩 중이면 요청하지 않음
    }

    if (!user) {
      setError('로그인이 필요합니다.');
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/my-places');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는 데 실패했습니다.');
      }

      // 매장 데이터 처리 - 이미지와 리뷰 정보 추출
      if (result.places && Array.isArray(result.places)) {
        result.places = result.places.map((place: PlaceData) => {
          // 대표 이미지 추출
          if (place.crawled_data?.basic_info) {
            const basicInfo = place.crawled_data.basic_info;
            if (basicInfo.representative_images && basicInfo.representative_images.length > 0) {
              place.place_image_url = basicInfo.representative_images[0];
            }

            // 리뷰 정보 추출
            if (basicInfo) { // basicInfo가 존재함을 이미 place.crawled_data?.basic_info 에서 확인했지만, 명시적으로 한 번 더 체크
              place.blog_reviews_count = basicInfo.blog_review_count || 0;
              place.visitor_reviews_count = basicInfo.visitor_review_count || 0;
            }
          }
          return place;
        });
      }

      setData(result);
      setError(null); // 성공 시 이전 오류 초기화
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('데이터 가져오기 오류:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, loading]); // 인증 상태가 변경될 때마다 다시 요청

  // 매장 삭제 처리
  const handlePlaceDelete = async () => {
    if (!selectedPlace) return;

    try {
      // 모달 즉시 닫기
      const placeName = selectedPlace.place_name;
      const placeId = selectedPlace.id;
      setShowDeleteModal(false);

      setIsProcessing(true);
      showToast(`${placeName} 매장을 삭제하는 중입니다.`, 'info');

      const response = await fetch(`/api/places/${placeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '매장 삭제에 실패했습니다.');
      }

      showToast(`${placeName} 매장이 성공적으로 삭제되었습니다.`, 'success');

      // 데이터 다시 가져오기
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.', 'error');
      console.error('매장 삭제 오류:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 매장 삭제 모달 열기
  const openDeleteModal = (place: PlaceData) => {
    setSelectedPlace(place);
    setShowDeleteModal(true);
  };

  // 일자 포맷팅 함수
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 남은 시간 계산
  const getRemainingDays = (targetDateStr: string): number => {
    const targetDate = new Date(targetDateStr);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 인증 상태 로딩 중이거나 데이터 로딩 중일 때
  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">내 매장 관리</h1>
        <div className="flex justify-center items-center py-6">
          <span className="loading loading-spinner loading-md"></span>
          <span className="ml-2">매장 정보 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // 사용자가 로그인하지 않은 경우
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="alert alert-warning shadow-lg max-w-xl w-full">
          <Warning size={24} weight="bold" />
          <div className="flex flex-col">
            <span className="font-bold">로그인이 필요합니다</span>
            <span className="text-sm">내 매장 관리 기능을 이용하려면 로그인해주세요.</span>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button className="btn btn-ghost" onClick={() => router.push('/')}>
            홈으로 돌아가기
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              // AuthContext에서 처리하는 방식에 따라 수정할 수 있음
              router.push('/?login=true');
            }}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="alert alert-error shadow-lg max-w-xl w-full">
          <Warning size={24} weight="bold" />
          <div className="flex flex-col">
            <span className="font-bold">오류가 발생했습니다</span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
        <button className="btn btn-primary mt-6" onClick={() => router.push('/')}>
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="alert alert-warning shadow-lg max-w-xl w-full">
          <Warning size={24} weight="duotone" />
          <div>데이터를 불러올 수 없습니다.</div>
        </div>
        <button className="btn btn-primary mt-6" onClick={fetchData}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">내 매장 관리</h1>

      {/* 구독 상태 카드 */}
      <div className="card bg-base-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {data.profile.subscription_tier === 'free'
                ? '무료 플랜'
                : data.profile.subscription_tier === 'premium'
                  ? '프리미엄 플랜'
                  : data.profile.subscription_tier === 'pro'
                    ? '프로 플랜'
                    : data.profile.subscription_tier === 'basic'
                      ? '베이직 플랜'
                      : data.profile.subscription_tier}
            </h2>
            <p className="text-sm">
              매장 {data.profile.used_places}/{data.profile.max_places}개 등록됨
            </p>
          </div>

          {/* 변경 정보 */}
          <div className="flex flex-col gap-1">
            {/* 남은 변경 횟수 표시 */}
            <div className="flex items-center gap-2">
              <PencilSimple size={16} />
              <span className="text-sm">
                {data.change_info.has_wildcard_available ? (
                  <span className="text-primary">첫 변경 기회 사용 가능 (무료)</span>
                ) : (
                  <span>
                    7일 이내 변경 가능 횟수:{' '}
                    <span
                      className={
                        data.change_info.remaining_place_changes > 0
                          ? 'text-success font-medium'
                          : 'text-error font-medium'
                      }
                    >
                      {data.change_info.remaining_place_changes}회
                    </span>
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockCounterClockwise size={18} />
              <span className="text-sm">
                {data.change_info.can_change_place ? (
                  <span className="text-success">매장 변경 가능</span>
                ) : (
                  <span>
                    변경 횟수 소진시 다음 매장 변경 가능일:{' '}
                    {formatDate(data.change_info.next_change_available_date!)}
                    (D-{getRemainingDays(data.change_info.next_change_available_date!)}일)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 매장 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.places.map(place => (
          <PlaceCard
            key={place.id}
            place={place}
            isProcessing={isProcessing}
            onDeleteClick={openDeleteModal}
            showActions={true}
            className="cursor-pointer"
          />
        ))}

        {/* 매장 추가 버튼 카드 */}
        <AddPlaceButton
          onClick={fetchData}
          canAddPlace={data.profile.used_places < data.profile.max_places}
          maxPlaces={data.profile.max_places}
          usedPlaces={data.profile.used_places}
        />
      </div>

      {/* 매장 삭제 모달 */}
      {showDeleteModal && (
        <div className="modal modal-open animate-fadeIn">
          <div className="modal-box animate-slideIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-error/10 p-2 rounded-full">
                <Trash size={24} className="text-error" />
              </div>
              <h3 className="font-bold text-lg">매장 삭제</h3>
            </div>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="btn btn-sm btn-ghost absolute right-2 top-2"
              disabled={isProcessing}
            >
              ✕
            </button>

            <div className="divider my-1"></div>

            <div className="py-2">
              <div className="bg-error/5 p-4 rounded-lg border border-error/20 mb-4">
                <p className="text-base-content">
                  <span className="font-bold">{selectedPlace?.place_name}</span> 매장을 정말
                  삭제하시겠습니까?
                </p>
                <p className="text-sm text-base-content/80 mt-2">
                  삭제 후에는 복구할 수 없으며, 모든 AI 카피도 함께 삭제됩니다.
                </p>
              </div>
            </div>

            <div className="modal-action mt-6">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={isProcessing}
              >
                취소
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={handlePlaceDelete}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    처리 중...
                  </>
                ) : (
                  '삭제하기'
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-base-300 bg-opacity-50"
            onClick={() => !isProcessing && setShowDeleteModal(false)}
          ></div>
        </div>
      )}
    </div>
  );
}
