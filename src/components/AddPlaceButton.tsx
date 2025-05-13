import React from 'react';
import { Plus } from '@phosphor-icons/react';
import { useToast } from '@/contexts/ToastContext';
import { useState } from 'react';

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
  usedPlaces
}: AddPlaceButtonProps) {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [placeUrl, setPlaceUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 디버깅용 - 콘솔에 표시
  console.log(`AddPlaceButton 렌더링: canAddPlace=${canAddPlace}, maxPlaces=${maxPlaces}, usedPlaces=${usedPlaces}`);

  const handleClick = () => {
    console.log(`버튼 클릭 시: canAddPlace=${canAddPlace}, maxPlaces=${maxPlaces}, usedPlaces=${usedPlaces}`);
    if (canAddPlace) {
      // 모달 열기
      setShowModal(true);
    } else {
      showToast(`매장 등록 한도(${maxPlaces}개)에 도달했습니다. 기존 매장을 삭제하거나 플랜을 업그레이드하세요.`, 'warning');
    }
  };

  const handleAddPlace = async () => {
    if (!placeUrl.trim()) return;
    
    try {
      setIsProcessing(true);
      const response = await fetch('/api/places/register-or-get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: placeUrl })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '매장 등록에 실패했습니다');
      }
      
      // API 응답이 성공했지만 Gemini API 오류가 있는 경우 특별 처리
      if (data.isGeminiApiError) {
        showToast('일시적인 AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.', 'warning');
      } else {
        showToast(data.message || '매장 등록이 진행 중입니다. 잠시 후 My 플레이스에서 확인해주세요.', 'success');
      }
      setShowModal(false);
      setPlaceUrl('');
      
      // 콜백 실행 (페이지 새로고침 등)
      if (onClick) {
        onClick();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '매장 등록 중 오류가 발생했습니다', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleClick}
        className="card bg-base-100 shadow-md hover:shadow-lg hover:border hover:border-primary transition-all h-[200px] flex items-center justify-center cursor-pointer"
      >
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Plus size={32} className="text-primary" weight="bold" />
          </div>
          <span className="text-base-content/80 font-medium">매장 추가하기</span>
        </div>
      </button>
      
      {/* 매장 추가 모달 - canAddPlace가 true일 때만 렌더링 */}
      {showModal && canAddPlace && (
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
                <br/>매장 정보를 가져오는 동안 처리가 완료될 때까지 기다려주세요.
              </p>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-primary/80">매장 네이버 플레이스 URL</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="https://map.naver.com/p/..." 
                    className="input input-bordered w-full pr-10 focus:border-primary" 
                    value={placeUrl}
                    onChange={(e) => setPlaceUrl(e.target.value)}
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
                ) : '추가하기'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-base-300 bg-opacity-50" onClick={() => !isProcessing && setShowModal(false)}></div>
        </div>
      )}
    </>
  );
} 