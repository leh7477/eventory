// 사이트 전역 상수

// ⚠️ 아래 회사 정보는 임의값(placeholder)입니다. 실제 정보로 교체하세요.
export const SITE = {
  name: "Eventory",
  nameKo: "이벤토리",
  tagline: "이벤트 장비 렌탈 전문",
  phone: "010-0000-0000",
  email: "contact@eventory.co.kr",
  ceo: "홍길동",
  bizNumber: "123-45-67890",
  address: "서울특별시 강남구 테헤란로 00, 0층",
};

// 견적 문의 네이버폼 링크 (환경변수로 관리, 미설정 시 빈 문자열)
export const NAVER_FORM_URL = process.env.NEXT_PUBLIC_NAVER_FORM_URL || "";

// 사이트 절대 URL (SEO/sitemap용) — 배포 시 실제 도메인으로 설정
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://eventory.co.kr";

// 기본 카테고리 (DB categories 테이블과 별개로, 탭 필터 등 UI 기본값 참고용)
export const DEFAULT_CATEGORIES = [
  "가챠머신",
  "에어볼추첨기",
  "스톱워치",
  "룰렛",
  "사격게임기",
  "핀볼게임",
];

// Supabase Storage 버킷명
export const STORAGE_BUCKET = "eventory-images";
