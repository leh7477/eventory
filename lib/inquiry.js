/**
 * 견적 문의 검사 — 화면과 서버가 같은 규칙을 쓰도록 한 곳에 둔다.
 *
 * DB 없이 동작하는 순수 함수라 스모크 테스트로 검증한다.
 * (scripts/smoke/modules/inquiry-logic.mjs)
 */

const REQUIRED = [
  ["company_name", "업체명"],
  ["contact_name", "담당자명"],
  ["phone", "연락처"],
  ["email", "이메일"],
  ["product", "문의 제품"],
  ["usage", "제품 용도"],
  ["event_start", "행사 시작일"],
  ["event_end", "행사 종료일"],
];

/**
 * 문제가 있으면 안내 문구를, 없으면 null 을 돌려준다.
 * 화면에서 한 번 거르지만, 서버에서도 반드시 다시 확인한다.
 * (화면을 거치지 않고 요청을 직접 만들 수 있기 때문)
 */
export function validateInquiry(f = {}) {
  for (const [k, label] of REQUIRED) {
    if (!String(f[k] ?? "").trim()) return `${label}을(를) 입력해주세요.`;
  }
  if (!f.privacy_agree) return "개인정보 수집·이용에 동의해주세요.";
  if (!String(f.address ?? "").trim()) {
    return "장소를 입력하거나 '장소 미정'을 선택해주세요.";
  }
  if (f.event_end < f.event_start) {
    return "행사 종료일이 시작일보다 앞설 수 없습니다.";
  }
  return null;
}

/** 저장 전 값 다듬기 — 공백 제거, 길이 제한, 빈 값은 null */
export function cleanInquiry(f = {}) {
  const c = (v, max) => {
    const s = String(v ?? "").trim();
    return s ? s.slice(0, max) : null;
  };
  return {
    company_name: c(f.company_name, 100),
    contact_name: c(f.contact_name, 50),
    phone: c(f.phone, 30),
    email: c(f.email, 100),
    product: c(f.product, 100),
    usage: c(f.usage, 20),
    event_start: f.event_start || null,
    event_end: f.event_end || null,
    address: c(f.address, 200),
    address_detail: c(f.address_detail, 200),
    message: c(f.message, 2000),
  };
}
