'use client';

interface SearchFormProps {
  onSubmit: () => void;
}

export default function SearchForm({ onSubmit }: SearchFormProps) {
  return (
    <div className="max-w-xl mx-auto mb-6">
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="네이버 플레이스 URL을 입력해주세요" 
          className="input input-bordered w-full focus:border-[#00E0FF]" 
        />
      </div>
      <button 
        className="btn w-full md:w-1/2 lg:w-1/3 btn-primary mx-auto block"
        onClick={onSubmit}
      >
        카피 생성하기
      </button>
    </div>
  );
} 