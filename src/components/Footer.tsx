'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-base-200 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
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
        
        <div className="border-t border-gray-300 pt-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>프로젝트 원제로 | 사업자등록번호: 648-75-00396 | 통신판매업 신고번호: 2024-서울동작-0475 | 대표자: 천주원</p>
            <p>문의: <a href="mailto:jwchun@onezero.now" className="hover:underline">jwchun@onezero.now</a></p>
            <p>주소: 서울특별시 금천구 시흥대로12길 15</p>
          </div>
        </div>
      </div>
    </footer>
  );
} 