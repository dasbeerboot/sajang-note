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
    <div className="flex flex-wrap gap-2 my-5">
      {items.map((item) => {
        const isActive = activeMenuId === item.id;
        const isSaved = savedMenuIds.includes(item.id);
        
        return (
          <button 
            key={item.id} 
            onClick={() => onSelectMenu(item.id)} 
            className={`px-4 py-1.5 rounded-md border text-md font-medium transition-all border-2 border-primary
              ${isActive 
                ? 'bg-primary text-white' 
                : 'bg-primary/10 border-base-300 hover:bg-primary hover:text-white'
              } ${isSaved ? 'ring-1 ring-primary/20 ring-inset' : ''}`}
            disabled={isLoading}
          >
            <span className="flex items-center gap-1">
              {item.label}
              {isSaved && (
                <span className={`w-2 h-2 rounded-full inline-block ${isActive ? 'bg-white' : 'bg-primary'}`} ></span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
} 