import { createClient } from "@/lib/supabase/server";
import { profileFromUser, canAccess } from "@/lib/admin/sections";

// 서버 액션/라우트에서 관리자 로그인 여부 확인
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

// 로그인 + 해당 메뉴 접근 권한까지 확인.
// 미들웨어는 '화면 이동'만 막으므로, 서버 액션은 여기서 스스로 권한을 다시 확인해야 한다.
// (권한 없는 직원이 요청을 직접 만들어 보내는 경우를 막는다)
export async function requireSection(sectionKey) {
  const user = await requireAdmin();
  if (!canAccess(profileFromUser(user), sectionKey)) {
    throw new Error("Forbidden");
  }
  return user;
}

// 여러 메뉴 중 하나라도 권한이 있으면 통과.
// 화면 하나가 두 메뉴에 걸치는 경우에 쓴다.
// (예: 견적 관리 화면에서 '일정 등록' — 견적 담당자도 할 수 있어야 한다)
export async function requireAnySection(...sectionKeys) {
  const user = await requireAdmin();
  const profile = profileFromUser(user);
  if (!sectionKeys.some((k) => canAccess(profile, k))) {
    throw new Error("Forbidden");
  }
  return user;
}
