import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic'; // 라우트를 동적으로 처리하도록 명시

// 매장 상세 정보 조회 API
export async function GET(
  req: NextRequest,
  { params }: { params: { placeId: string } } // 인라인 타입 정의 및 구조 분해
) {
  try {
    const placeId = params.placeId; // params에서 placeId 직접 사용
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    if (!placeId) {
      return NextResponse.json(
        { error: '매장 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }
    
    // 매장 정보 조회 (error_message 포함)
    const { data: place, error: fetchError } = await supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single();
    
    if (fetchError || !place) {
      return NextResponse.json(
        { error: '매장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 소유권 확인
    if (place.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 매장에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        place: place 
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('매장 정보 조회 중 오류:', error);
    return NextResponse.json(
      { error: '요청을 처리하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: { placeId: string } } // 타입을 직접 명시
) {
  try {
    const placeId = context.params.placeId; // context에서 placeId 추출
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    if (!placeId) {
      return NextResponse.json(
        { error: '매장 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }
    
    // 매장 존재 여부 및 소유권 확인
    const { data: place, error: fetchError } = await supabase
      .from('places')
      .select('id, user_id')
      .eq('id', placeId)
      .single();
    
    if (fetchError || !place) {
      return NextResponse.json(
        { error: '매장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 소유권 확인
    if (place.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 매장에 대한 삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 변경 가능 여부 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('next_place_change_date, remaining_place_changes')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('사용자 프로필 조회 오류:', profileError);
      return NextResponse.json(
        { error: '사용자 프로필 정보를 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 변경 가능 여부 체크 (매장 삭제도 변경으로 간주)
    const nextChangeDate = profile.next_place_change_date ? new Date(profile.next_place_change_date) : null;
    const now = new Date();
    
    // 변경 가능 기간이 아니고, 남은 변경 횟수도 0이면 변경 불가능
    if (nextChangeDate && nextChangeDate > now && profile.remaining_place_changes <= 0) {
      return NextResponse.json(
        { 
          error: `매장 변경 간격 제한으로 인해 ${nextChangeDate.toISOString().split('T')[0]}까지 매장을 삭제할 수 없습니다.`,
          nextChangeDate: nextChangeDate.toISOString()
        },
        { status: 403 }
      );
    }
    
    // 먼저 관련 AI 카피 삭제
    const { error: deleteAiCopiesError } = await supabase
      .from('ai_generated_copies')
      .delete()
      .eq('place_id', placeId);
    
    if (deleteAiCopiesError) {
      console.error('AI 카피 삭제 오류:', deleteAiCopiesError);
      return NextResponse.json(
        { error: 'AI 카피 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 매장 삭제 (트리거에 의해 place_change_logs 기록 및 next_place_change_date 업데이트됨)
    const { error: deletePlaceError } = await supabase
      .from('places')
      .delete()
      .eq('id', placeId);
    
    if (deletePlaceError) {
      console.error('매장 삭제 오류:', deletePlaceError);
      return NextResponse.json(
        { error: '매장 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 캐시 무효화
    revalidatePath('/my-places');
    revalidatePath('/');
    
    return NextResponse.json(
      { success: true, message: '매장이 성공적으로 삭제되었습니다.' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('매장 삭제 처리 중 오류:', error);
    return NextResponse.json(
      { error: '요청을 처리하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}