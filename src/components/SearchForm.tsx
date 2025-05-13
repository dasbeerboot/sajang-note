'use client';

import { useState } from 'react';

interface SearchFormProps {
  onSubmit: (url: string) => void;
}

export default function SearchForm({ onSubmit }: SearchFormProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-6">
      <div className="mb-4">
        <input
          type="text"
          placeholder="네이버 플레이스 URL을 입력해주세요"
          className="input input-bordered w-full focus:border-[#00E0FF]"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn w-full md:w-1/2 lg:w-1/3 btn-primary mx-auto block">
        카피 생성하기
      </button>
    </form>
  );
}
