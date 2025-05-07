'use client';

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import AuthStatus from "@/components/AuthStatus";

export default function Header() {
  return (
    <header className="text-white p-4" style={{ background: 'linear-gradient(to right, rgba(50, 56, 251, 0.8) 70%, rgba(240, 90, 100, 0.7) 100%)' }}>
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">사장노트</Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
} 