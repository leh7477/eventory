// 관리자 로그인 유지용 핑 — 응답 본문은 없음.
// /admin/* 이라 미들웨어가 로그인 여부를 확인하고(없으면 로그인 화면으로 리다이렉트),
// 통과하면 활동 시각 쿠키를 갱신한다. (AdminIdleGuard 가 화면 조작이 있을 때 주기적으로 호출)
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
