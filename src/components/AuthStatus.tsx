'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext'; // openAuthModal을 위해 다시 추가
import Link from 'next/link';
import Image from 'next/image';
import { User, CreditCard } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

export default function AuthStatus() {
  const { user, loading, signOut, subscriptionStatus } = useAuth();
  const { openAuthModal } = useAuthModal(); // openAuthModal 가져오기 (로그인 버튼용)
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSubscriptionNavigation = () => {
    // 로그인 상태에 따라 분기
    if (user) {
      // 로그인 사용자: 구독 상태에 따라 프로필 또는 체크아웃으로
      if (subscriptionStatus === 'active') {
        router.push('/profile');
      } else {
        router.push('/subscription/checkout');
      }
    } else {
      // 비로그인 사용자: 바로 체크아웃 페이지로 보내 가격 정보 확인 유도
      router.push('/subscription/checkout');
    }
  };

  // 클릭 이벤트 핸들러
  const handleOutsideClick = (e: Event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsDropdownOpen(false);
    }
  };

  // 드롭다운 토글
  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  // 드롭다운 닫기
  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // 외부 클릭 이벤트 리스너
  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="btn btn-sm btn-ghost flex items-center gap-1 opacity-50">
          <CreditCard size={18} />
          <span className="hidden sm:inline">구독 관리</span>
        </div>
        <div className="loading loading-spinner loading-xs"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleSubscriptionNavigation}
        className="btn btn-sm btn-ghost text-white hover:bg-white/20 flex items-center gap-1"
        title="구독 관리"
      >
        <CreditCard size={18} /> 
        <span className="hidden sm:inline">구독 관리</span>
      </button>

      {user ? (
        <div ref={dropdownRef} className="relative">
          <button 
            onClick={toggleDropdown} 
            className="btn btn-sm btn-ghost btn-circle avatar"
          >
            {user.user_metadata.avatar_url ? (
              <div className="w-8 rounded-full">
                <Image 
                  src={user.user_metadata.avatar_url} 
                  alt="User avatar"
                  width={32} 
                  height={32}
                  className="rounded-full"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User size={18} weight="fill" className="text-white" />
              </div>
            )}
          </button>
          
          {isDropdownOpen && (
            <ul className="menu menu-sm absolute right-0 mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 text-base-content">
              <li>
                <Link 
                  href="/profile" 
                  className="justify-between text-base-content hover:bg-base-300"
                  onClick={closeDropdown}
                >
                  프로필
                </Link>
              </li>
              <li>
                <Link 
                  href="/my-places" 
                  className="justify-between text-base-content hover:bg-base-300"
                  onClick={closeDropdown}
                >
                  내 매장 관리
                </Link>
              </li>
              <li>
                <button 
                  onClick={() => {
                    closeDropdown();
                    signOut();
                  }} 
                  className="text-base-content hover:bg-base-300 w-full text-left"
                >
                  로그아웃
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : (
        <button 
          onClick={openAuthModal} 
          className={`btn btn-sm btn-ghost text-white hover:bg-white/20`}
        >
          로그인
        </button>
      )}
    </div>
  );
} 