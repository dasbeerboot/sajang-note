import React from 'react';
import { Plus } from '@phosphor-icons/react';
import { useToast } from '@/contexts/ToastContext';

interface AddPlaceButtonProps {
  onClick: () => void;
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

  const handleClick = () => {
    if (canAddPlace) {
      onClick();
    } else {
      showToast(`매장 등록 한도(${maxPlaces}개)에 도달했습니다. 기존 매장을 삭제하거나 플랜을 업그레이드하세요.`, 'warning');
    }
  };

  return (
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
  );
} 