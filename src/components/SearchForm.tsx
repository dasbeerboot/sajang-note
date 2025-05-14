'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface SearchFormProps {
  onSubmit: (url: string) => void;
}

export default function SearchForm({ onSubmit }: SearchFormProps) {
  const [url, setUrl] = useState('');
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      showToast('URL을 입력해주세요.', 'error');
      return;
    }

    if (trimmedUrl.startsWith('https://naver.me/')) {
      showToast(
        '단축 URL은 사용할 수 없습니다. ID가 포함된 전체 네이버 플레이스 URL을 입력해주세요. (예: https://m.place.naver.com/restaurant/12345)',
        'warning'
      );
      return;
    }

    onSubmit(trimmedUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-6">
      <div className="mb-4">
        <input
          type="text"
          placeholder="네이버 플레이스 URL을 입력해주세요"
          className="input input-bordered w-full focus:border-[#00E0FF] text-base"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn w-full md:w-1/2 lg:w-1/3 btn-primary mx-auto block">
        마케팅 컨텐츠 만들러가기
      </button>
    </form>
  );
}
