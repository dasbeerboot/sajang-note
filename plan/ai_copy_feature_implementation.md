# 사장노트 AI 카피 생성 기능 구현 계획

현재까지 기본적인 AI 카피 생성 기능을 구현했고, 다음은 추가 기능과 UX 개선을 위한 구현 계획입니다.

## 1. 데이터 모델 설계

### 생성된 카피 저장용 테이블 추가
```sql
CREATE TABLE ai_generated_copies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  copy_type TEXT NOT NULL, -- 'danggn_title', 'danggn_post' 등
  user_prompt TEXT, -- 사용자 입력 프롬프트 저장
  generated_content TEXT NOT NULL, -- 생성된 전체 콘텐츠
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(place_id, copy_type) -- 메뉴 타입별로 하나의 카피만 저장
);

-- 테이블에 RLS 적용
ALTER TABLE ai_generated_copies ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 카피만 조회 가능
CREATE POLICY "사용자는 자신의 카피만 조회 가능" ON ai_generated_copies
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 카피만 생성 가능
CREATE POLICY "사용자는 자신의 카피만 생성 가능" ON ai_generated_copies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 카피만 업데이트 가능  
CREATE POLICY "사용자는 자신의 카피만 업데이트 가능" ON ai_generated_copies
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 카피만 삭제 가능
CREATE POLICY "사용자는 자신의 카피만 삭제 가능" ON ai_generated_copies
  FOR DELETE USING (auth.uid() = user_id);
```

## 2. 컴포넌트 구조 업데이트

### 1) 컴포넌트 설계

1. **AICopyChat 컴포넌트** (새로 생성)
```tsx
// src/components/AICopyChat.tsx
// AI와 대화하는 형태의 UI 구현
```

2. **AICopyForm 컴포넌트** (새로 생성)
```tsx
// src/components/AICopyForm.tsx
// 사용자 요청 입력 폼 구현
```

3. **AICopyDisplay 컴포넌트** (새로 생성)
```tsx
// src/components/AICopyDisplay.tsx
// 생성된 카피 표시 및 응답 내 [카피], [제목] 등을 강조 표시
```

4. **AICopyButtonList 컴포넌트** (기존 업데이트)
```tsx
// src/components/AICopyButtonList.tsx
// 현재 선택된 메뉴 active 상태 표시 추가
```

### 2) 주요 컴포넌트별 구현 내용

#### AICopyButtonList 컴포넌트 (업데이트)
```tsx
// 기존 코드에서 active 상태 관리 추가
interface AICopyButtonListProps {
  items: Array<{ id: string; label: string }>;
  onSelectMenu: (id: string) => void;
  activeMenuId: string | null;
  savedMenuIds: string[]; // 이미 저장된 메뉴 ID 목록
}

export default function AICopyButtonList({ 
  items, 
  onSelectMenu, 
  activeMenuId,
  savedMenuIds
}: AICopyButtonListProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectMenu(item.id)}
          className={`btn ${activeMenuId === item.id ? 'btn-primary' : 'btn-outline'} 
                     ${savedMenuIds.includes(item.id) ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
        >
          {item.label}
          {savedMenuIds.includes(item.id) && (
            <span className="badge badge-sm badge-success ml-2">저장됨</span>
          )}
        </button>
      ))}
    </div>
  );
}
```

#### AICopyForm 컴포넌트 (신규)
```tsx
interface AICopyFormProps {
  onSubmit: (userPrompt: string) => void;
  isGenerating: boolean;
  copyType: string;
}

export default function AICopyForm({ onSubmit, isGenerating, copyType }: AICopyFormProps) {
  const [userPrompt, setUserPrompt] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(userPrompt);
  };
  
  return (
    <form onSubmit={handleSubmit} className="mt-6 p-4 bg-base-200 rounded-lg">
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">
          추가 요청사항이 있으신가요?
        </label>
        <textarea 
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          className="textarea textarea-bordered w-full" 
          placeholder="원하는 내용, 강조할 점, 특별한 요구사항 등을 자유롭게 작성해주세요."
          disabled={isGenerating}
        />
      </div>
      
      <div className="flex justify-end mt-2">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="loading loading-spinner loading-xs mr-2"></span>
              생성 중...
            </>
          ) : `${getCopyTypeLabel(copyType)} 생성하기`}
        </button>
      </div>
    </form>
  );
}

// 카피 타입에 따른 라벨 반환
function getCopyTypeLabel(copyType: string): string {
  const typeLabelMap: Record<string, string> = {
    'danggn_title': '당근 광고 제목',
    'danggn_post': '당근 가게 소식',
    'powerlink_ad': '파워링크 광고',
    'naver_place_description': '플레이스 소개글'
  };
  
  return typeLabelMap[copyType] || '카피';
}
```

#### AICopyDisplay 컴포넌트 (신규)
```tsx
interface AICopyDisplayProps {
  content: string;
  copyType: string;
  onNewCopy: () => void;
  isSaved: boolean;
}

export default function AICopyDisplay({ 
  content, 
  copyType, 
  onNewCopy,
  isSaved
}: AICopyDisplayProps) {
  // 대괄호로 감싸진 텍스트를 볼드체로 변환하는 함수
  const formatContent = (text: string) => {
    const parts = [];
    let lastIndex = 0;
    
    // [텍스트] 패턴 찾기
    const regex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // 이전 텍스트 추가
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // 대괄호 안의 텍스트를 볼드로 추가
      parts.push(<strong key={match.index}>{match[0]}</strong>);
      
      lastIndex = match.index + match[0].length;
    }
    
    // 남은 텍스트 추가
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };
  
  return (
    <div className="mt-6 p-4 border border-base-300 rounded-md bg-base-100 shadow-lg animate-fadeIn">
      {isSaved && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">
            {getCopyTypeLabel(copyType)} (저장됨)
          </h3>
          <button 
            onClick={onNewCopy}
            className="btn btn-sm btn-outline"
          >
            새로 만들기
          </button>
        </div>
      )}
      
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-sm bg-base-200 p-3 rounded-md">
          {formatContent(content)}
        </pre>
      </div>
      
      <div className="flex justify-end mt-4 gap-2">
        <button 
          onClick={() => navigator.clipboard.writeText(content)}
          className="btn btn-sm btn-outline"
        >
          복사하기
        </button>
      </div>
    </div>
  );
}
```

#### 페이지 컴포넌트 (업데이트)
```tsx
// src/app/p/[placeId]/page.tsx
export default function PlaceDetailPage(props: {
  params: { placeId: string }
}) {
  // ... 기존 상태 ...
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [savedMenuIds, setSavedMenuIds] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [showNewCopyModal, setShowNewCopyModal] = useState(false);

  // 저장된 카피 목록 로드
  useEffect(() => {
    if (placeData) {
      loadSavedCopies(placeData.id);
    }
  }, [placeData]);

  // 저장된 카피 로드 함수
  const loadSavedCopies = async (placeId: string) => {
    const { data, error } = await supabase
      .from('ai_generated_copies')
      .select('copy_type, generated_content')
      .eq('place_id', placeId);
      
    if (error) {
      console.error('저장된 카피 로드 오류:', error);
      return;
    }
    
    // 저장된 메뉴 ID 목록 업데이트
    const savedIds = data.map(item => item.copy_type);
    setSavedMenuIds(savedIds);
    
    // localStorage에도 저장 (오프라인 접근용)
    if (data.length > 0) {
      for (const item of data) {
        localStorage.setItem(`copy_${placeId}_${item.copy_type}`, item.generated_content);
      }
    }
  };

  // 메뉴 선택 처리
  const handleSelectMenu = async (copyType: string) => {
    setActiveMenuId(copyType);
    setCurrentCopyType(copyType);
    
    // 이미 저장된 카피가 있는지 확인
    if (savedMenuIds.includes(copyType)) {
      // 저장된 카피 불러오기
      const savedCopy = localStorage.getItem(`copy_${placeData?.id}_${copyType}`);
      if (savedCopy) {
        setGeneratedCopy(savedCopy);
        return;
      }
      
      // localStorage에 없으면 DB에서 다시 조회
      const { data, error } = await supabase
        .from('ai_generated_copies')
        .select('generated_content, user_prompt')
        .eq('place_id', placeData?.id)
        .eq('copy_type', copyType)
        .single();
        
      if (!error && data) {
        setGeneratedCopy(data.generated_content);
        setUserPrompt(data.user_prompt || '');
      } else {
        // 에러 발생 시 저장된 목록에서 제거
        setSavedMenuIds(prev => prev.filter(id => id !== copyType));
      }
    } else {
      // 저장된 카피가 없으면 초기화
      setGeneratedCopy(null);
      setUserPrompt('');
    }
  };

  // 카피 생성 처리
  const handleGenerateCopy = async (userPromptInput: string) => {
    if (!placeData) return;
    
    setIsGeneratingCopy(true);
    setGeneratedCopy(null);
    setUserPrompt(userPromptInput);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-copy', {
        body: { 
          placeId: placeData.id,
          copyType: activeMenuId,
          userPrompt: userPromptInput || null
        }
      });

      if (error) {
        alert('카피 생성 중 오류가 발생했습니다: ' + error.message);
        setGeneratedCopy('오류: ' + error.message);
      } else if (data && typeof data.generatedCopy === 'string') {
        const generatedContent = data.generatedCopy;
        setGeneratedCopy(generatedContent);
        
        // 생성된 카피 저장
        await saveCopy(placeData.id, activeMenuId!, userPromptInput, generatedContent);
        
        // 저장된 메뉴 목록 업데이트
        if (!savedMenuIds.includes(activeMenuId!)) {
          setSavedMenuIds(prev => [...prev, activeMenuId!]);
        }
        
        // localStorage에도 저장
        localStorage.setItem(`copy_${placeData.id}_${activeMenuId}`, generatedContent);
      } else {
        setGeneratedCopy('알 수 없는 응답 형식입니다.');
      }
    } catch (e: any) {
      alert('카피 생성 중 예외가 발생했습니다: ' + e.message);
      setGeneratedCopy('예외: ' + e.message);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // 카피 저장 함수
  const saveCopy = async (placeId: string, copyType: string, userPrompt: string, content: string) => {
    const { error } = await supabase
      .from('ai_generated_copies')
      .upsert({
        place_id: placeId,
        user_id: user?.id,
        copy_type: copyType,
        user_prompt: userPrompt,
        generated_content: content,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'place_id,copy_type'
      });
      
    if (error) {
      console.error('카피 저장 오류:', error);
    }
  };

  // 새 카피 생성 모달 함수
  const handleNewCopyClick = () => {
    setShowNewCopyModal(true);
  };

  // 새 카피 생성 확인 함수
  const handleConfirmNewCopy = () => {
    setGeneratedCopy(null);
    setUserPrompt('');
    setShowNewCopyModal(false);
  };

  // 메인 렌더링 부분
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PlaceSummarySection placeData={placeData} />
      
      <AICopyButtonList 
        items={aiCopyMenuItemsData} 
        onSelectMenu={handleSelectMenu}
        activeMenuId={activeMenuId}
        savedMenuIds={savedMenuIds}
      />
      
      {activeMenuId && !generatedCopy && !isGeneratingCopy && (
        <AICopyForm 
          onSubmit={handleGenerateCopy}
          isGenerating={isGeneratingCopy}
          copyType={activeMenuId}
        />
      )}
      
      {generatedCopy && (
        <AICopyDisplay 
          content={generatedCopy}
          copyType={activeMenuId!}
          onNewCopy={handleNewCopyClick}
          isSaved={savedMenuIds.includes(activeMenuId!)}
        />
      )}
      
      {/* 새로 만들기 확인 모달 */}
      {showNewCopyModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">카피를 새로 만드시겠습니까?</h3>
            <p className="py-4">이전에 생성된 카피가 삭제됩니다. 계속하시겠습니까?</p>
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={() => setShowNewCopyModal(false)}
              >
                돌아가기
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleConfirmNewCopy}
              >
                새로 만들기
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowNewCopyModal(false)}></div>
        </div>
      )}
    </div>
  );
}
```

## 3. 애니메이션 및 스타일 추가

### tailwind.config.js에 애니메이션 설정 추가
```js
module.exports = {
  // ... 기존 설정
  theme: {
    extend: {
      // ... 기존 확장
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in-out',
        'slideIn': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  // ... 기타 설정
};
```

## 4. 구현 순서 및 작업 계획

1. **데이터베이스 스키마 구성**
   - Supabase에서 `ai_generated_copies` 테이블 생성 및 RLS 설정

2. **컴포넌트 구현**
   - 새 컴포넌트 생성: `AICopyForm.tsx`, `AICopyDisplay.tsx`
   - 기존 컴포넌트 수정: `AICopyButtonList.tsx`, 페이지 컴포넌트

3. **상태 관리 및 로직 구현**
   - 메뉴 선택 및 액티브 상태 표시
   - 저장된 카피 관리 및 로드 기능
   - 새로 만들기 기능 및 모달

4. **스타일 및 애니메이션 개선**
   - tailwind.config.js 설정 추가
   - 애니메이션 적용

5. **테스트 및 디버깅**
   - 주요 기능 동작 테스트
   - 다양한 상황에서의 UI 테스트
   - 코드 최적화 및 리팩토링 