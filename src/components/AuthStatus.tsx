'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@phosphor-icons/react';

export default function AuthStatus() {
  const { user, loading, signOut } = useAuth();
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
        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 text-base-content">
          <li>
            <Link href="/profile" className="justify-between text-base-content hover:bg-base-300">
              프로필
            </Link>
          </li>
          <li><button onClick={signOut} className="text-base-content hover:bg-base-300 w-full text-left">로그아웃</button></li>
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