'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@phosphor-icons/react';

export default function AuthStatus() {
  const { user, loading, signOut } = useAuth();
  const { theme } = useTheme();

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
                alt="" 
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
        <ul tabIndex={0} className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-base-100 rounded-box w-52 text-base-content">
          <li>
            <a className="justify-between">
              프로필
              <span className="badge">New</span>
            </a>
          </li>
          <li><a>설정</a></li>
          <li><button onClick={signOut}>로그아웃</button></li>
        </ul>
      </div>
    );
  }

  return (
    <Link 
      href="/login" 
      className={`btn btn-sm btn-outline text-primary-content border-primary-content ${
        theme === 'light' 
          ? 'hover:bg-white hover:text-primary hover:border-white' 
          : 'hover:bg-gray-800 hover:text-gray-100 hover:border-gray-800'
      }`}
    >
      로그인
    </Link>
  );
} 