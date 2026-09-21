// 관리자 자동 로그아웃(무활동) 규칙 — 미들웨어(서버)와 AdminIdleGuard(브라우저) 공용
//
// 흐름
//  1) 브라우저: 클릭·키입력·스크롤 등 화면 조작이 있으면 "마지막 조작 시각"을 갱신 (IDLE 기준 2시간)
//  2) 브라우저: 조작이 없어 만료 WARN 분 전이 되면 "로그인 유지 / 로그아웃" 팝업, 끝까지 응답 없으면 로그아웃
//  3) 브라우저: 조작이 있으면 주기적으로 /admin/keepalive 를 호출해 서버의 활동 쿠키도 갱신
//  4) 서버(미들웨어): 브라우저를 그냥 닫은 경우를 위한 안전장치 — 브라우저 기준보다 약간 늦게 만료
export const ACTIVITY_COOKIE = "admin_last_active";

const num = (v, d) => {
  const n = Number(v);
  return n > 0 ? n : d;
};

// 무활동 허용 시간(분) / 만료 몇 분 전에 팝업을 띄울지
// (테스트용으로 NEXT_PUBLIC_ADMIN_IDLE_MINUTES / NEXT_PUBLIC_ADMIN_WARN_MINUTES 로 덮어쓸 수 있음)
export const IDLE_MS = num(process.env.NEXT_PUBLIC_ADMIN_IDLE_MINUTES, 120) * 60 * 1000;
export const WARN_MS = Math.min(
  num(process.env.NEXT_PUBLIC_ADMIN_WARN_MINUTES, 10) * 60 * 1000,
  IDLE_MS / 2
);

// 서버 안전장치 만료 시간 = 브라우저 기준 + 여유(최대 5분). 브라우저가 항상 먼저 반응하도록.
export const SERVER_IDLE_MS = IDLE_MS + Math.min(5 * 60 * 1000, IDLE_MS * 0.1);

// 조작이 있을 때 서버 활동 쿠키를 갱신하는 주기
export const PING_MS = Math.min(3 * 60 * 1000, IDLE_MS / 6);

// 마지막 활동 쿠키 값 → 서버 기준 무활동 시간이 지났는지
// 쿠키가 없거나 숫자가 아니면(기존 로그인 등) 만료로 보지 않음
export function isIdleExpired(lastValue, now = Date.now(), idleMs = SERVER_IDLE_MS) {
  const last = Number(lastValue);
  if (!last || !Number.isFinite(last)) return false;
  return now - last > idleMs;
}
