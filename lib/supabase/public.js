import { createClient } from "@supabase/supabase-js";

// 공개(읽기 전용) 데이터용 anon 클라이언트.
// 쿠키/세션이 필요 없는 서버 컴포넌트의 공개 데이터 조회에 사용.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
