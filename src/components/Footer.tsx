'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-base-200 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-500">© 2025 프로젝트 원제로. All rights reserved.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="text-sm text-gray-500 hover:underline">
              개인정보 처리방침
            </Link>
            <Link href="/terms" className="text-sm text-gray-500 hover:underline">
              이용약관
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 