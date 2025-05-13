import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Storefront, Trash, MagnifyingGlass, ChatCircle } from '@phosphor-icons/react';
import Image from 'next/image';

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

interface PlaceCardProps {
  place: PlaceData;
  isProcessing?: boolean;
  onDeleteClick?: (place: PlaceData) => void;
  showActions?: boolean;
  className?: string;
}

export default function PlaceCard({
  place,
  isProcessing = false,
  onDeleteClick,
  showActions = true,
  className = ''
}: PlaceCardProps) {
  const router = useRouter();

  // 일자 포맷팅 함수
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '날짜 없음';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleViewPlace = () => {
    router.push(`/p/${place.id}`);
  };

  return (
    <div 
      className={`card bg-base-100 shadow-md hover:shadow-lg hover:border hover:border-primary transition-all h-[200px] cursor-pointer ${className}`}
      onClick={handleViewPlace}
    >
      <div className="card-body p-4">
        <div className="flex gap-3">
          {/* 좌측 이미지 */}
          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-base-200 relative">
            {place.place_image_url ? (
              <Image
                src={place.place_image_url}
                alt={place.place_name}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-base-content/30">
                <Storefront size={32} />
              </div>
            )}
          </div>

          {/* 우측 정보 */}
          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <h3 className="card-title text-lg">
                {place.place_name || '이름 로딩 중...'}
                {place.status === 'processing' && (
                  <div className="badge badge-warning badge-sm gap-1 ml-2">
                    <span className="loading loading-spinner loading-xs"></span>
                    처리 중
                  </div>
                )}
                {place.status === 'failed' && (
                  <div className="badge badge-error badge-sm">오류</div>
                )}
              </h3>
              {showActions && (
                <div 
                  className="dropdown dropdown-end"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <label 
                    tabIndex={0} 
                    className="btn btn-sm btn-ghost"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </label>
                  <ul 
                    tabIndex={0} 
                    className="dropdown-content z-10 menu p-2 shadow bg-base-100 rounded-box w-52" 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <li>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleViewPlace(); }}
                        className="text-primary"
                      >
                        <Storefront size={18} />
                        매장 페이지 보기
                      </button>
                    </li>
                    {onDeleteClick && (
                      <li>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteClick(place); }}
                          className="text-error"
                          disabled={isProcessing}
                        >
                          <Trash size={18} />
                          매장 삭제
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-sm text-base-content/60 mt-1 flex">{place.place_address || '주소 로딩 중...'}</p>
            {place.status === 'processing' && (
              <div className="flex items-center mt-1 text-xs">
                <span className="text-warning opacity-80">데이터를 가져오는 중입니다. 잠시만 기다려주세요.</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 text-xs text-base-content/80 mt-2">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>등록: {formatDate(place.created_at)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span>AI 카피 {place.copies_count}개</span>
              </div>

              {/* 리뷰 정보 */}
              {(place.blog_reviews_count !== undefined || place.visitor_reviews_count !== undefined) && (
                <div className="flex flex-wrap gap-1 w-full mt-1">
                  {place.blog_reviews_count !== undefined && place.blog_reviews_count > 0 && (
                    <div className="badge badge-xs badge-outline gap-1 py-1 h-5 whitespace-nowrap overflow-hidden">
                      <MagnifyingGlass size={10} />
                      <span className="truncate max-w-[90px]">블로그 {place.blog_reviews_count}개</span>
                    </div>
                  )}
                  {place.visitor_reviews_count !== undefined && place.visitor_reviews_count > 0 && (
                    <div className="badge badge-xs badge-outline gap-1 py-1 h-5 whitespace-nowrap overflow-hidden">
                      <ChatCircle size={10} />
                      <span className="truncate max-w-[90px]">방문 {place.visitor_reviews_count}개</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 