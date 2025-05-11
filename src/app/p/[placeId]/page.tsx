import { notFound } from 'next/navigation';
import PlaceDetailClient from '@/components/PlaceDetailClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface PageProps {
  params: { placeId: string };
}

export default async function PlaceDetailPage({ params }: PageProps) {
  const { placeId } = params;
  
  // 서버 컴포넌트에서 초기 데이터 가져오기
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  
  // 사용자 세션 확인
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // 로그인 페이지로 리디렉션 로직은 서버에서 처리 가능
    // 여기에서는 클라이언트 컴포넌트에 정보만 전달
    return <PlaceDetailClient placeId={placeId} initialError="로그인이 필요합니다." />;
  }

  // 매장 정보 가져오기
  const { data: placeData, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', placeId)
    .single();

  if (error) {
    console.error(`[PlaceDetailPage] 매장 정보 조회 실패:`, error?.message);
    return <PlaceDetailClient placeId={placeId} initialError="매장 정보를 불러오는 데 실패했습니다." />;
  }
  
  if (!placeData) {
    return notFound();
  }

  // 권한 검사 (자신의 매장인지 확인)
  if (placeData.user_id !== session.user.id) {
    console.warn(`[PlaceDetailPage] 접근 권한 없음. 요청: ${session.user.id}, 소유자: ${placeData.user_id}`);
    return <PlaceDetailClient placeId={placeId} initialError="이 매장에 대한 접근 권한이 없습니다." />;
  }

  // 클라이언트 컴포넌트로 데이터 전달
  return (
    <PlaceDetailClient 
      placeId={placeId} 
      initialPlaceData={placeData} 
    />
  );
}
