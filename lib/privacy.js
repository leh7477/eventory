// 개인정보처리방침 공통 정의 — 처리방침 페이지와 견적 폼 동의문이 같은 내용을 쓰도록 한 곳에서 관리
//
// ⚠️ 오픈 전 반드시 확인할 것
//  1) lib/constants.js 의 SITE (대표자·사업자번호·주소·연락처)가 아직 임시값입니다.
//     처리방침은 법적 문서라 임시값 상태로 공개하면 안 됩니다.
//  2) PRIVACY_OFFICER (개인정보 보호책임자)를 실제 담당자로 채워주세요.
//  3) Supabase 리전이 국외이면 '국외이전' 고지가 추가로 필요합니다.
//     (Supabase 대시보드 → Settings → General → Region 확인)

// 처리방침 시행일 — 내용을 고치면 이 날짜도 함께 갱신하세요.
export const PRIVACY_EFFECTIVE_DATE = "2026-09-24";

// 동의문 버전 — 내용이 바뀌면 올려주세요. 문의 기록에 함께 저장됩니다.
export const PRIVACY_VERSION = "1.0";

// 개인정보 보호책임자 (개인정보보호법 제31조)
export const PRIVACY_OFFICER = {
  name: "(담당자명)",     // ⚠️ 실제 이름으로 교체
  position: "(직책)",      // ⚠️ 예: 대표
};

// 견적 문의에서 실제로 받는 항목 — QuoteForm 과 일치해야 합니다.
export const COLLECTED_REQUIRED = [
  "업체명",
  "담당자명",
  "연락처",
  "이메일",
  "문의 제품",
  "제품 용도",
  "행사 시작일·종료일",
  "행사 장소(주소·상세주소)",
];
export const COLLECTED_OPTIONAL = ["기타 문의사항"];

// 동의받을 때 반드시 알려야 하는 4가지 (개인정보보호법 제15조 제2항)
export const CONSENT_NOTICE = {
  purpose: "견적 산출·회신 및 상담, 계약 체결과 이행(장비 대여·제작, 납품·회수 일정 조율), 대금 청구 및 정산",
  items: COLLECTED_REQUIRED.join(", "),
  optional: COLLECTED_OPTIONAL.join(", "),
  period: "문의 접수일로부터 3년 (계약이 체결된 경우 관계 법령에서 정한 기간)",
  refusal:
    "동의를 거부하실 수 있습니다. 다만 위 항목은 견적 산출에 반드시 필요하여, 거부하시면 견적 문의 접수가 제한됩니다.",
};
