'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Storefront, PencilSimple, Trash, ClockCounterClockwise, Warning, Plus } from '@phosphor-icons/react';
import PlaceCard from '@/components/PlaceCard';
import AddPlaceButton from '@/components/AddPlaceButton';

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
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceData | null>(null);
  const [newPlaceUrl, setNewPlaceUrl] = useState('');
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
        result.places = result.places.map((place: any) => {
          // 대표 이미지 추출
          const representativeImages = place.crawled_data?.basic_info?.representative_images;
          if (representativeImages && representativeImages.length > 0) {
            place.place_image_url = representativeImages[0];
          }
          
          // 리뷰 정보 추출
          const basicInfo = place.crawled_data?.basic_info;
          if (basicInfo) {
            place.blog_reviews_count = basicInfo.blog_review_count || 0;
            place.visitor_reviews_count = basicInfo.visitor_review_count || 0;
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

  // 매장 변경 처리
  const handlePlaceChange = async () => {
    if (!selectedPlace || !newPlaceUrl) return;
    
    try {
      // 폼 값 저장 (모달 닫은 후에도 사용)
      const placeId = selectedPlace.id;
      const placeName = selectedPlace.place_name;
      const url = newPlaceUrl;
      
      // 모달 즉시 닫기
      setShowChangeModal(false);
      setNewPlaceUrl('');
      
      // 처리 시작
      setIsProcessing(true);
      
      // 요청 중임을 알리는 토스트 표시
      showToast(`${placeName} 매장을 다른 매장으로 변경 중입니다.\n 수집이 완료되면 자동으로 반영됩니다.`, 'info');
      
      // 1단계: 변경 준비 요청
      const response = await fetch('/api/my-places/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeId: placeId, 
          newPlaceUrl: url,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '매장 변경에 실패했습니다.');
      }
      
      // 데이터 다시 가져오기
      await fetchData();
      
      // 변경된 매장의 상태 확인을 위한 폴링 시작
      startPollingPlaceStatus(placeId, result.data.is_first_change);
      
    } catch (err) {
      showToast(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.', 'error');
      console.error('매장 변경 오류:', err);
      setIsProcessing(false);
    }
  };
  
  // 매장 상태 폴링 (10초마다 확인, 최대 3분)
  const startPollingPlaceStatus = async (placeId: string, isFirstChange: boolean) => {
    let attempts = 0;
    const maxAttempts = 18; // 3분 (10초 * 18)
    
    const checkStatus = async () => {
      try {
        const result = await fetchData();
        
        if (!result || !result.places) return false;
        
        // 변경된 매장 찾기
        const place = result.places.find((p: PlaceData) => p.id === placeId);
        
        if (!place) return false;
        
        // 상태 확인
        if (place.status === 'completed') {
          // 2단계: 변경 완료 요청
          const completeResponse = await fetch('/api/my-places/complete-change', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              placeId,
              isFirstChange,
            }),
          });
          
          if (completeResponse.ok) {
            showToast(`${place.place_name} 매장 정보가 성공적으로 변경되었습니다.`, 'success');
            fetchData(); // 최종 데이터 갱신
          } else {
            const errorData = await completeResponse.json();
            console.error('매장 변경 완료 오류:', errorData);
            showToast(errorData.error || '매장 변경 처리 중 오류가 발생했습니다.', 'error');
          }
          
          return true;
        } else if (place.status === 'failed') {
          showToast('매장 정보 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
          return true;
        }
        
        return false;
      } catch (err) {
        console.error('매장 상태 확인 오류:', err);
        return false;
      }
    };
    
    const poll = async () => {
      attempts++;
      
      const isComplete = await checkStatus();
      
      if (isComplete || attempts >= maxAttempts) {
        if (attempts >= maxAttempts && !isComplete) {
          showToast('매장 정보 처리가 지연되고 있습니다. 나중에 다시 확인해주세요.', 'warning');
        }
        setIsProcessing(false);
        return;
      }
      
      setTimeout(poll, 10000); // 10초마다 상태 확인
    };
    
    poll();
  };

  // 매장 삭제 처리도 유사하게 개선
  const handlePlaceDelete = async () => {
    if (!selectedPlace) return;
    
    // 변경 가능 여부 다시 확인
    if (!data?.change_info.can_change_place) {
      const nextDate = data?.change_info.next_change_available_date;
      showToast(`매장 변경 간격 제한으로 인해 ${formatDate(nextDate!)}까지 매장을 삭제할 수 없습니다.`, 'warning');
      setShowDeleteModal(false);
      return;
    }
    
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

  // 매장 변경 모달 열기
  const openChangeModal = (place: PlaceData) => {
    // 이미 처리 중인 상태면 모달 열지 않음
    if (place.status === 'processing') {
      showToast('이 매장은 현재 처리 중입니다. 완료 후 다시 시도해주세요.', 'warning');
      return;
    }
    
    // 변경 가능 여부 체크
    if (!data?.change_info.can_change_place) {
      const nextDate = data?.change_info.next_change_available_date;
      showToast(`매장 변경 간격 제한으로 인해 ${formatDate(nextDate!)}까지 다른 매장으로 변경할 수 없습니다.`, 'warning');
      return;
    }
    
    setSelectedPlace(place);
    setNewPlaceUrl('');
    setShowChangeModal(true);
  };

  // 매장 삭제 모달 열기
  const openDeleteModal = (place: PlaceData) => {
    // 변경 가능 여부 체크
    if (!data?.change_info.can_change_place) {
      const nextDate = data?.change_info.next_change_available_date;
      showToast(`매장 변경 간격 제한으로 인해 ${formatDate(nextDate!)}까지 매장을 삭제할 수 없습니다.`, 'warning');
      return;
    }
    
    setSelectedPlace(place);
    setShowDeleteModal(true);
  };

  // 일자 포맷팅 함수
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
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
          <button className="btn btn-primary" onClick={() => {
            // AuthContext에서 처리하는 방식에 따라 수정할 수 있음
            router.push('/?login=true');
          }}>
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
              {data.profile.subscription_tier === 'free' ? '무료 플랜' : 
               data.profile.subscription_tier === 'premium' ? '프리미엄 플랜' : 
               data.profile.subscription_tier === 'pro' ? '프로 플랜' : 
               data.profile.subscription_tier === 'basic' ? '베이직 플랜' : 
               data.profile.subscription_tier}
            </h2>
            <p className="text-sm">
              매장 {data.profile.used_places}/{data.profile.max_places}개 등록됨
            </p>
          </div>
          
          {data.profile.used_places < data.profile.max_places && data.places.length > 0 && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => router.push('/')}
            >
              <Storefront size={18} />
              새 매장 등록하기
            </button>
          )}
          
          {/* 변경 정보 */}
          <div className="flex items-center gap-2">
            <ClockCounterClockwise size={18} />
            <span className="text-sm">
              {data.change_info.can_change_place ? (
                <span className="text-success">매장 변경 가능</span>
              ) : (
                <span>
                  다음 매장 변경 가능일: {formatDate(data.change_info.next_change_available_date!)}
                  (앞으로 {getRemainingDays(data.change_info.next_change_available_date!)}일)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
      
      {/* 매장 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            canChange={data.change_info.can_change_place}
            isProcessing={isProcessing}
            onChangeClick={openChangeModal}
            onDeleteClick={openDeleteModal}
            showActions={true}
            className="cursor-pointer"
          />
        ))}
        
        {/* 매장 추가 버튼 카드 */}
        <AddPlaceButton 
          onClick={() => router.push('/')}
          canAddPlace={data.profile.used_places < data.profile.max_places}
          maxPlaces={data.profile.max_places}
          usedPlaces={data.profile.used_places}
        />
      </div>
      
      {/* 매장이 없는 경우 */}
      {data.places.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="card bg-base-100 shadow-lg p-8 max-w-md text-center">
            <div className="mb-6">
              <Storefront size={64} className="mx-auto text-primary mb-4" weight="duotone" />
              <h3 className="text-2xl font-bold mb-3">등록된 매장이 없습니다</h3>
              <p className="text-base-content/70 mb-4">
                네이버 플레이스 URL을 등록하고 AI 카피를 생성해보세요.
              </p>
              <p className="text-sm text-base-content/60 mb-6">
                {data.profile.max_places}개의 매장을 등록할 수 있습니다.
              </p>
            </div>
            <button 
              className="btn btn-primary btn-lg w-full"
              onClick={() => router.push('/')}
            >
              <Storefront size={20} className="mr-2" />
              매장 등록하러 가기
            </button>
          </div>
        </div>
      )}
      
      {/* 매장 변경 모달 */}
      {showChangeModal && (
        <div className="modal modal-open animate-fadeIn">
          <div className="modal-box animate-slideIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <PencilSimple size={24} className="text-primary" />
              </div>
              <h3 className="font-bold text-lg">다른 매장으로 변경</h3>
            </div>
            <button
              onClick={() => setShowChangeModal(false)}
              className="btn btn-sm btn-ghost absolute right-2 top-2"
              disabled={isProcessing}
            >
              ✕
            </button>
            
            <div className="divider my-1"></div>
            
            <div className="py-2">
              <p className="mb-4 text-base-content/80">
                <span className="font-semibold text-base-content">{selectedPlace?.place_name}</span> 정보를 다른 매장으로 변경합니다.
                <br />변경 후 새로운 매장 데이터를 가져오는 동안 처리가 완료될 때까지 기다려주세요.
              </p>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-primary/80">새로운 매장 네이버 플레이스 URL</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="https://map.naver.com/p/..." 
                    className="input input-bordered w-full pr-10 focus:border-primary" 
                    value={newPlaceUrl}
                    onChange={(e) => setNewPlaceUrl(e.target.value)}
                    disabled={isProcessing}
                  />
                  {newPlaceUrl && (
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      onClick={() => setNewPlaceUrl('')}
                      disabled={isProcessing}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-action mt-6">
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => setShowChangeModal(false)}
                disabled={isProcessing}
              >
                취소
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handlePlaceChange}
                disabled={!newPlaceUrl || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    처리 중...
                  </>
                ) : '변경하기'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-base-300 bg-opacity-50" onClick={() => !isProcessing && setShowChangeModal(false)}></div>
        </div>
      )}
      
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
                  <span className="font-bold">{selectedPlace?.place_name}</span> 매장을 정말 삭제하시겠습니까?
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
                ) : '삭제하기'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-base-300 bg-opacity-50" onClick={() => !isProcessing && setShowDeleteModal(false)}></div>
        </div>
      )}
    </div>
  );
} 