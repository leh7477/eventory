// 관리자 자동 로그아웃(무활동) 규칙 — 미들웨어에서 사용
// 마지막 /admin 요청 시각을 쿠키에 기록하고, 이 시간 넘게 요청이 없으면 로그아웃시킨다.
export const ACTIVITY_COOKIE = "admin_last_active";

// 기본 12시간. (테스트용으로 ADMIN_IDLE_HOURS 환경변수로 덮어쓸 수 있음)
export const IDLE_MS =
  (Number(process.env.ADMIN_IDLE_HOURS) || 12) * 60 * 60 * 1000;

// 마지막 활동 쿠키 값 → 무활동 시간이 지났는지
// 쿠키가 없거나 숫자가 아니면(기존 로그인 등) 만료로 보지 않음
export function isIdleExpired(lastValue, now = Date.now(), idleMs = IDLE_MS) {
  const last = Number(lastValue);
  if (!last || !Number.isFinite(last)) return false;
  return now - last > idleMs;
}
