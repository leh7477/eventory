import { createClient } from "@/lib/supabase/server";

// 서버 액션/라우트에서 관리자 로그인 여부 확인
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
