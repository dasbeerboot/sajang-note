import { createClient } from '@supabase/supabase-js';

// 서버 컴포넌트에서 사용하는 Supabase 클라이언트
export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, supabaseServiceKey);
}; 