'use client';

import React from 'react';

interface CopyMenuItem {
  id: string; 
  label: string; 
}

interface AICopyButtonListProps {
  items: CopyMenuItem[];
  onSelectMenu: (copyType: string) => void;
  activeMenuId: string | null;
  savedMenuIds: string[];
  isLoading?: boolean;
}

export default function AICopyButtonList({ 
  items, 
  onSelectMenu,
  activeMenuId,
  savedMenuIds,
  isLoading = false
}: AICopyButtonListProps) {
  return (
    <section>
      <h2 className="text-lg sm:text-xl font-semibold mb-5 text-center text-base-content">✨ AI로 만드는 마법같은 카피 ✨</h2>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {items.map((item) => {
          const isActive = activeMenuId === item.id;
          const isSaved = savedMenuIds.includes(item.id);
          
          return (
            <button 
              key={item.id} 
              onClick={() => onSelectMenu(item.id)} 
              className={`btn btn-sm rounded-md border ${
                isActive 
                  ? 'bg-primary text-primary-content border-primary' 
                  : 'bg-base-100 text-base-content border-base-300 hover:bg-primary/10'
              } ${
                isSaved ? 'ring-2 ring-primary/30 ring-offset-1' : ''
              } focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 
              group transition-colors duration-150 ease-in-out px-3 py-1.5 
              min-w-[100px] sm:min-w-[120px] items-center animate-fadeIn`}
              disabled={isLoading}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium tracking-wide">{item.label}</span>
                {isSaved && !isActive && (
                  <span className="badge badge-xs badge-accent"></span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
} 