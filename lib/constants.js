// 사이트 전역 상수

export const SITE = {
  name: "Eventory",
  nameKo: "이벤토리",
  tagline: "이벤트 장비 렌탈 전문",
  phone: "010-0000-0000", // TODO: 실제 대표 전화번호로 교체
};

// 견적 문의 네이버폼 링크 (환경변수로 관리, 미설정 시 빈 문자열)
export const NAVER_FORM_URL = process.env.NEXT_PUBLIC_NAVER_FORM_URL || "";

// 기본 카테고리 (DB categories 테이블과 별개로, 탭 필터 등 UI 기본값 참고용)
export const DEFAULT_CATEGORIES = [
  "가챠머신",
  "에어볼추첨기",
  "스톱워치",
  "룰렛",
  "사격게임기",
  "캡슐뽑기",
];

// Supabase Storage 버킷명
export const STORAGE_BUCKET = "eventory-images";
