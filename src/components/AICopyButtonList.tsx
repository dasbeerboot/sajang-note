'use client';

import React from 'react';
interface CopyMenuItem {
  id: string; 
  label: string; 
}

interface AICopyButtonListProps {
  items: CopyMenuItem[];
}

export default function AICopyButtonList({ items }: AICopyButtonListProps) {
  const handleButtonClick = (copyType: string) => {
    console.log('AICopyButtonList clicked:', copyType);
    // alert(`카피 타입 '${copyType}' 선택됨. (UI 테스트용)`);
  };

  return (
    <section>
      <h2 className="text-lg sm:text-xl font-semibold mb-5 text-center text-base-content">✨ AI로 만드는 마법같은 카피 ✨</h2>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {items.map((item) => {
          return (
            <button 
              key={item.id} 
              onClick={() => handleButtonClick(item.id)} 
              className="btn btn-sm rounded-md border border-base-300 bg-base-100 text-base-content hover:bg-primary hover:text-primary-content hover:border-primary focus:bg-primary focus:text-primary-content focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 group transition-colors duration-150 ease-in-out px-3 py-1.5 min-w-[100px] sm:min-w-[120px] items-center"
            >
              <span className="text-xs font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
} 