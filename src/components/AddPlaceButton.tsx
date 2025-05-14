import React from 'react';
import { Plus } from '@phosphor-icons/react';
import { useToast } from '@/contexts/ToastContext';
import { useState, useEffect } from 'react';
import analytics, { Events } from '@/lib/analytics';

interface AddPlaceButtonProps {
  onClick?: () => void;
  canAddPlace: boolean;
  maxPlaces: number;
  usedPlaces: number;
}

export default function AddPlaceButton({
  onClick,
  canAddPlace,
  maxPlaces,
  usedPlaces,
}: AddPlaceButtonProps) {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [placeUrl, setPlaceUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [justAddedPlaceId, setJustAddedPlaceId] = useState<string | null>(null);

  // 디버깅용 - 콘솔에 표시
  console.info(
    `AddPlaceButton 렌더링: canAddPlace=${canAddPlace}, maxPlaces=${maxPlaces}, usedPlaces=${usedPlaces}`
  );

  // 처리중 상태일 때 자동으로 모달 닫기
  useEffect(() => {
    if (isProcessing || justAddedPlaceId) {
      setShowModal(false);
    }
  }, [isProcessing, justAddedPlaceId]);

  // 매장 추가 후 상태 체크
  useEffect(() => {
    let checkTimer: NodeJS.Timeout;

    // 방금 추가한 매장이 있으면 상태 확인
    if (justAddedPlaceId) {
      const checkPlaceStatus = async () => {
        try {
          const response = await fetch(`/api/places/${justAddedPlaceId}`);

          if (!response.ok) {
            // 요청 실패 시 타이머 취소 후 상태 초기화
            clearTimeout(checkTimer);
            setJustAddedPlaceId(null);
            return;
          }

          const data = await response.json();

          // API 응답 구조에 맞게 데이터 처리
          const place = data.place || data;

          // 처리가 완료되면 새로고침하고 상태 초기화
          if (place.status === 'completed' || place.status === 'failed') {
            clearTimeout(checkTimer);
            setJustAddedPlaceId(null);

            // 매장 목록 새로고침
            if (onClick) onClick();
          } else {
            // 아직 처리 중이면 3초 후 다시 확인
            checkTimer = setTimeout(checkPlaceStatus, 3000);
          }
        } catch (_error) {
          // 오류 발생 시 타이머 취소 후 상태 초기화
          clearTimeout(checkTimer);
          setJustAddedPlaceId(null);
        }
      };

      // 최초 확인 시작 - 첫 확인은 5초 후부터 (매장 생성 시간 고려)
      checkTimer = setTimeout(checkPlaceStatus, 5000);

      // 컴포넌트 언마운트 시 타이머 정리
      return () => {
        clearTimeout(checkTimer);
      };
    }
  }, [justAddedPlaceId, onClick]);

  const handleClick = () => {
    console.info(
      `버튼 클릭 시: canAddPlace=${canAddPlace}, maxPlaces=${maxPlaces}, usedPlaces=${usedPlaces}`
    );

    // 이미 처리 중인 상태면 모달 열지 않음
    if (isProcessing || justAddedPlaceId) {
      showToast('이미 처리 중인 매장이 있습니다. 완료 후 다시 시도해주세요.', 'warning');
      return;
    }

    if (canAddPlace) {
      // 모달 열기
      setShowModal(true);
    } else {
      showToast(
        `매장 등록 한도(${maxPlaces}개)에 도달했습니다. 기존 매장을 삭제하거나 플랜을 업그레이드하세요.`,
        'warning'
      );
    }
  };

  const handleAddPlace = async () => {
    const trimmedUrl = placeUrl.trim();
    if (!trimmedUrl) {
      showToast('URL을 입력해주세요.', 'error');
      return;
    }

    if (isProcessing || justAddedPlaceId) {
      showToast('이미 처리 중인 매장이 있습니다. 완료 후 다시 시도해주세요.', 'warning');
      return;
    }

    if (trimmedUrl.startsWith('https://naver.me/')) {
      showToast(
        '단축 URL은 사용할 수 없습니다. ID가 포함된 전체 네이버 플레이스 URL을 입력해주세요. (예: https://m.place.naver.com/restaurant/12345)',
        'warning'
      );
      return;
    }

    // 매장 추가 시작 이벤트 추적
    analytics.trackEvent(Events.ADD_PLACE, {
      url: trimmedUrl,
      status: 'started',
    });

    try {
      setIsProcessing(true);
      // 처리 시작 시 모달 즉시 닫기
      setShowModal(false);

      const response = await fetch('/api/places/register-or-get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '매장 등록에 실패했습니다');
      }

      // 이미 등록된 매장 또는 처리 중인 매장인 경우
      if (!data.isNew) {
        if (data.status === 'processing' || data.status === 'pending') {
          showToast('해당 매장은 이미 처리 중입니다. 잠시 후 다시 확인해주세요.', 'info');
        } else {
          showToast('이미 등록된 매장입니다.', 'info');
        }

        // 이벤트 추적 - 이미 등록된 매장
        analytics.trackEvent(Events.ADD_PLACE, {
          url: trimmedUrl,
          status: 'already_exists',
          place_id: data.placeId || data.id,
        });

        // 이미 등록된 매장이 있으므로 목록 새로고침
        if (onClick) onClick();

        // 방금 추가한 매장 ID 저장 (상태 확인용)
        if (data.placeId) {
          setJustAddedPlaceId(data.placeId);
          
          // 이벤트 추적 - 성공적으로 매장 추가됨
          analytics.trackEvent(Events.ADD_PLACE, {
            url: trimmedUrl,
            status: 'success',
            place_id: data.placeId,
            place_name: data.place_name || '',
          });
        }
      } else {
        // 새로 등록된 매장인 경우
        // API 응답이 성공했지만 Gemini API 오류가 있는 경우 특별 처리
        if (data.isGeminiApiError) {
          showToast(
            '일시적인 AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.',
            'warning'
          );
        } else {
          showToast(
            data.message || '매장 등록이 진행 중입니다. 잠시 후 My 플레이스에서 확인해주세요.',
            'success'
          );

          // 방금 추가한 매장 ID 저장 (상태 확인용)
          if (data.placeId) {
            setJustAddedPlaceId(data.placeId);
            
            // 이벤트 추적 - 성공적으로 매장 추가됨
            analytics.trackEvent(Events.ADD_PLACE, {
              url: trimmedUrl,
              status: 'success',
              place_id: data.placeId,
              place_name: data.place_name || '',
            });
          }
        }

        // 데이터가 변경되었으므로 목록 새로고침
        if (onClick) onClick();
      }

      // 처리 완료 후 초기화
      setPlaceUrl('');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '매장 등록 중 오류가 발생했습니다',
        'error'
      );
      
      // 이벤트 추적 - 매장 추가 실패
      analytics.trackEvent(Events.ADD_PLACE, {
        url: trimmedUrl,
        status: 'error',
        error_message: error instanceof Error ? error.message : '매장 등록 중 오류가 발생했습니다',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="card bg-base-100 shadow-md hover:shadow-lg hover:border hover:border-primary transition-all h-[200px] flex items-center justify-center cursor-pointer"
        disabled={isProcessing || justAddedPlaceId !== null}
      >
        <div className="text-center">
          <div className="flex justify-center mb-2">
            {isProcessing || justAddedPlaceId ? (
              <span className="loading loading-spinner loading-md text-primary"></span>
            ) : (
              <Plus size={32} className="text-primary" weight="bold" />
            )}
          </div>
          <span className="text-base-content/80 font-medium">
            {isProcessing || justAddedPlaceId ? '처리 중...' : '매장 추가하기'}
          </span>
        </div>
      </button>

      {/* 매장 추가 모달 - canAddPlace가 true이고 현재 처리 중인 매장이 없을 때만 렌더링 */}
      {showModal && canAddPlace && !justAddedPlaceId && (
        <div className="modal modal-open animate-fadeIn">
          <div className="modal-box animate-slideIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Plus size={24} className="text-primary" />
              </div>
              <h3 className="font-bold text-lg">새 매장 추가하기</h3>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="btn btn-sm btn-ghost absolute right-2 top-2"
              disabled={isProcessing}
            >
              ✕
            </button>

            <div className="divider my-1"></div>

            <div className="py-2">
              <p className="mb-4 text-base-content/80">
                추가할 매장의 네이버 플레이스 URL을 입력해주세요.
                <br />
                매장 정보를 가져오는 동안 처리가 완료될 때까지 기다려주세요.
              </p>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-primary/80">
                    매장 네이버 플레이스 URL
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="https://m.place.naver.com/restaurant/12345"
                    className="input input-bordered w-full pr-10 focus:border-primary text-base"
                    value={placeUrl}
                    onChange={e => setPlaceUrl(e.target.value)}
                    disabled={isProcessing}
                  />
                  {placeUrl && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                      onClick={() => setPlaceUrl('')}
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
                onClick={() => setShowModal(false)}
                disabled={isProcessing}
              >
                취소
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddPlace}
                disabled={!placeUrl || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    처리 중...
                  </>
                ) : (
                  '추가하기'
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-base-300 bg-opacity-50"
            onClick={() => !isProcessing && setShowModal(false)}
          ></div>
        </div>
      )}
    </>
  );
}
