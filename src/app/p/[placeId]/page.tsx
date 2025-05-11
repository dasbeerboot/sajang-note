import { notFound, redirect } from 'next/navigation';
import PlaceSummarySection from '@/components/PlaceSummarySection';
import AICopyButtonList from '@/components/AICopyButtonList';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface PlaceData { 
  id: string;
  user_id: string; 
  place_id: string; 
  place_name?: string;
  place_address?: string;
  place_url?: string;
  status?: 'completed' | 'processing' | 'failed';
  crawled_data?: any; 
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  last_crawled_at?: string | null;
  content_last_changed_at?: string | null;
}

interface CopyMenuItemForPage {
  id: string; 
  label: string; 
}

const aiCopyMenuItemsData: CopyMenuItemForPage[] = [
  { id: 'danggn_title', label: '당근 광고 제목' },
  { id: 'danggn_post', label: '당근 가게 소식' },
  { id: 'powerlink_ad', label: '네이버 파워링크' },
  { id: 'naver_place_description', label: '플레이스 소개글' },
  { id: 'instagram_post', label: '인스타그램 게시물' },
  { id: 'threads_post_idea', label: '스레드 아이디어' }, 
  { id: 'blog_post_draft_partial', label: '블로그 초안' }, 
];

// Next.js 14+ 페이지 컴포넌트
export default async function PlaceDetailPage(props: {
  params: { placeId: string }
}) {
  // 1. 쿠키 스토어 초기화 - await 사용
  const cookieStore = await cookies();
  
  // 파라미터도 비동기로 처리
  const { placeId } = await props.params;
  console.log(`[PlaceDetailPage] 매장 ID: ${placeId}`);
  
  // 2. Supabase 클라이언트 초기화 - @supabase/ssr 사용
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {}, // 서버 컴포넌트에서는 쿠키 설정 불가
        remove: () => {} // 서버 컴포넌트에서는 쿠키 삭제 불가
      }
    }
  );
  
  // 3. 사용자 세션 확인 (보안을 위해 getUser() 사용)
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  
  // 4. 세션이 없으면 로그인 페이지로 리디렉션
  if (!user) {
    // 실제 로그인 페이지가 없는 경우 로그인 필요 페이지 표시
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <div role="alert" className="alert alert-warning max-w-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h3 className="font-bold">로그인이 필요합니다</h3>
            <div className="text-xs">이 페이지를 보려면 로그인이 필요합니다. <br/> 사용자 인증 후 이용 가능한 서비스입니다.</div>
          </div>
        </div>
        <a href="/" className="btn btn-primary mt-4">홈으로 돌아가기</a>
      </div>
    );
  }
  
  // 5. 관리자 권한으로 매장 정보 조회 (RLS 우회)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서비스 롤 키
  );
  
  // 관리자 권한으로 데이터 조회
  const { data: placeData, error } = await adminClient
    .from('places')
    .select('*')
    .eq('id', placeId)
    .single();
  
  // 매장이 존재하지 않는 경우
  if (error) {
    console.error(`[PlaceDetailPage] 매장 정보 조회 실패:`, error?.message);
    return notFound();
  }
  
  if (!placeData) {
    console.error(`[PlaceDetailPage] 매장 정보 조회 실패: 데이터 없음`);
    return notFound();
  }
  
  // 8. 권한 검사 (자신의 매장인지 확인)
  if (placeData.user_id !== user.id) {
    console.warn(`[PlaceDetailPage] 접근 권한 없음. 요청: ${user.id}, 소유자: ${placeData.user_id}`);
    
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <div role="alert" className="alert alert-error max-w-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold">접근 권한 없음</h3>
            <div className="text-xs">이 매장에 대한 접근 권한이 없습니다.</div>
          </div>
        </div>
        <a href="/" className="btn btn-primary mt-4">홈으로 돌아가기</a>
      </div>
    );
  }
  
  // 9. 상태별 UI 렌더링
  if (placeData.status === 'processing') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-xl font-semibold mb-3">{placeData.place_name || '매장 정보'} 처리 중...</h1>
        <p className="mb-2 text-center text-sm text-base-content/80">AI가 매장 정보를 분석하고 있습니다.<br/>새로고침하거나 잠시 후 'My 플레이스'에서 확인해주세요.</p>
        <span className="loading loading-lg loading-spinner text-primary mt-4"></span>
      </div>
    );
  }

  if (placeData.status === 'failed') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
        <div role="alert" className="alert alert-error max-w-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold">매장 정보 처리 실패</h3>
            <div className="text-xs break-all">오류: {placeData.error_message || '알 수 없는 오류.'}</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-center max-w-md text-base-content/80">정보 수집/분석 중 문제가 발생했습니다. 'My 플레이스'에서 삭제 후 다시 시도하거나 지원팀에 문의해주세요.</p>
      </div>
    );
  }
  
  // 10. 정상 데이터 렌더링
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PlaceSummarySection placeData={placeData} />
      <AICopyButtonList items={aiCopyMenuItemsData} /> 
    </div>
  );
}
