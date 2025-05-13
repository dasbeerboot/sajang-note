// src/lib/supabase.ts
// 'use client'; // 최상위 모듈 레벨에서는 보통 필요하지 않습니다.

import { createBrowserClient } from '@supabase/ssr';

// 이 함수는 클라이언트 컴포넌트나 useEffect 내에서 호출되어야 합니다.
// 전역 supabase 인스턴스를 만들 경우, 서버 환경과 클라이언트 환경에서 다르게 동작할 수 있습니다.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 기존 export const supabase = createClient(supabaseUrl, supabaseAnonKey); 방식은
// 서버 사이드 렌더링이나 API 라우트에서 쿠키 기반 인증을 올바르게 처리하지 못할 수 있습니다.
// 앱 전체에서 공유되는 단일 인스턴스가 필요하다면,
// Context 내부나 클라이언트 사이드에서 한 번만 생성하여 사용하는 것을 고려해야 합니다.
// 지금은 getSupabaseBrowserClient 함수를 export 하여 사용하는 곳에서 호출하도록 합니다.
