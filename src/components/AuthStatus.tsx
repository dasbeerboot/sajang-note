'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@phosphor-icons/react';
import { useAuthModal } from '@/contexts/AuthModalContext';

export default function AuthStatus() {
  const { user, loading, signOut } = useAuth();
  const { theme } = useTheme();
  const { openAuthModal } = useAuthModal();

  if (loading) {
    return <div className="loading loading-spinner loading-xs"></div>;
  }

  if (user) {
    return (
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-sm btn-ghost btn-circle avatar">
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
        </label>
        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
          <li>
            <Link href="/profile" className="justify-between">
              프로필
            </Link>
          </li>
          <li><button onClick={signOut}>로그아웃</button></li>
        </ul>
      </div>
    );
  }

  return (
    <button 
      onClick={openAuthModal}
      className={`btn btn-sm btn-ghost text-white hover:bg-white/20`}
    >
      로그인
    </button>
  );
} 