'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-medium mb-6">페이지를 찾을 수 없습니다</h2>
      <p className="text-base-content/70 mb-8 text-center">
        찾으시는 페이지가 이동되었거나 삭제되었을 수 있습니다.
      </p>
      <Link href="/" className="btn btn-primary">
        홈으로 돌아가기
      </Link>
    </div>
  );
} 