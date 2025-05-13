'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CaretUp, CaretDown, MagnifyingGlass, ChatCircle } from '@phosphor-icons/react';

interface PlaceData { // page.tsx와 타입을 공유하거나, 필요한 props만 받도록 개선 필요
  id: string;
  place_name?: string;
  place_address?: string;
  crawled_data?: {
    basic_info?: {
      representative_images?: string[];
      phone_number?: string;
    };
    detailed_info?: {
      description?: string;
      opening_hours_raw?: string;
    };
    review_analysis?: {
      positive_keywords_from_reviews?: string[];
    }
  };
}

interface ReviewCounts {
  blogReviews?: number;
  visitorReviews?: number;
}

interface PlaceSummarySectionProps {
  placeData: PlaceData;
  reviewCounts?: ReviewCounts;
}

export default function PlaceSummarySection({ placeData, reviewCounts }: PlaceSummarySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false); 

  const { crawled_data, place_name } = placeData;
  const representativeImage = crawled_data?.basic_info?.representative_images?.[0] || `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(place_name || 'Image')}`;
  const summaryDescription = crawled_data?.detailed_info?.description || "매장 설명을 불러오는 데 실패했습니다.";
  const keywords = crawled_data?.review_analysis?.positive_keywords_from_reviews || [];

  // 리뷰 데이터 유무 확인
  const hasReviewData = reviewCounts && (reviewCounts.blogReviews || reviewCounts.visitorReviews);

  return (
    <section className={`mb-10 bg-base-100 rounded-xl shadow-sm transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'p-3' : 'p-4 sm:p-6'}`}> 
      <div className={`flex ${isCollapsed ? 'flex-row items-center justify-between' : 'flex-col'}`}> 
        
        {isCollapsed ? (
          <>
            <h1 className={`text-md sm:text-lg font-semibold text-base-content truncate pr-2 flex-grow`}> 
              {place_name || '매장 정보'}
            </h1>
            <button 
              onClick={() => setIsCollapsed(false)} 
              className="btn btn-ghost btn-circle btn-sm p-1 flex-shrink-0" 
              aria-label="정보 펼치기"
            >
              <CaretDown size={24} weight="bold" />
            </button>
          </>
        ) : (
          <div className="relative w-full"> 
            <div className={`flex flex-col md:flex-row items-start gap-4 md:gap-6 pb-8`}> 
              <div className="w-full md:w-[200px] lg:w-[250px] flex-shrink-0">
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden shadow-md">
                  <Image 
                    src={representativeImage} 
                    alt={place_name || '매장 대표 이미지'} 
                    fill
                    className="object-cover"
                    priority 
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 200px, 250px"
                  />
                </div>
              </div>

              <div className="w-full flex flex-col flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                  <h1 className="text-lg sm:text-xl font-bold text-base-content mb-2 sm:mb-0">
                    {place_name || '매장 이름 없음'}
                  </h1>
                  <div className="flex gap-1.5 flex-shrink-0 mt-1 sm:mt-0">
                    <button className="btn btn-xs btn-outline btn-ghost hover:bg-base-300 text-xs">새로고침</button>
                    <button className="btn btn-xs btn-outline btn-ghost hover:bg-base-300 text-xs">매장변경</button>
                  </div>
                </div>

                {summaryDescription && <p className="text-xs sm:text-sm text-base-content/70 mb-3 leading-relaxed line-clamp-3 sm:line-clamp-4">{summaryDescription}</p>}
                
                <div className="text-xs space-y-1 mb-3 text-base-content/70">
                  {placeData.place_address && <p><span className="font-semibold">주소:</span> {placeData.place_address}</p>}
                  {crawled_data?.basic_info?.phone_number && <p><span className="font-semibold">전화:</span> {crawled_data.basic_info.phone_number}</p>}
                  {crawled_data?.detailed_info?.opening_hours_raw && <p><span className="font-semibold">영업:</span> {crawled_data.detailed_info.opening_hours_raw}</p>}
                </div>
                
                {/* 리뷰 정보 표시 */}
                {hasReviewData && (
                  <div className="flex flex-wrap gap-2">
                    {reviewCounts?.blogReviews !== undefined && reviewCounts.blogReviews > 0 && (
                      <div className="badge badge-md gap-1 bg-base-200">
                        <MagnifyingGlass size={14} />
                        <span>블로그 리뷰 {reviewCounts.blogReviews}개</span>
                      </div>
                    )}
                    {reviewCounts?.visitorReviews !== undefined && reviewCounts.visitorReviews > 0 && (
                      <div className="badge badge-md gap-1 bg-base-200">
                        <ChatCircle size={14} />
                        <span>방문자 리뷰 {reviewCounts.visitorReviews}개</span>
                      </div>
                    )}
                  </div>
                )}
                
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2"> 
                    {keywords.map(keyword => (
                      <div key={keyword} className="badge badge-sm badge-outline badge-success font-normal">{keyword}</div>
                    ))}
                  </div>
                )}
              </div>
            </div> 
            
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"> 
              <button 
                onClick={() => setIsCollapsed(true)} 
                className="btn btn-circle btn-sm p-1 bg-base-300 hover:bg-base-100 shadow-md" 
                aria-label="정보 접기"
              >
                <CaretUp size={20} weight="bold" /> 
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
} 