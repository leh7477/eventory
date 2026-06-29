// 데모용 샘플 데이터 (실제 데이터 등록 시 자동 교체됨)

const seed = (s) => `https://picsum.photos/seed/${s}/1200/800`;

export const SAMPLE_CASES = [
  {
    id: "s1",
    title: "스톱워치",
    description: "기업 박람회 부스 이벤트",
    tags: ["스톱워치", "박람회", "부스이벤트"],
    images: [seed("eventory-1a"), seed("eventory-1b"), seed("eventory-1c"), seed("eventory-1d")],
  },
  {
    id: "s2",
    title: "가챠머신",
    description: "쇼핑몰 오픈 기념 행사",
    tags: ["가챠머신", "쇼핑몰", "오픈행사"],
    images: [seed("eventory-2a"), seed("eventory-2b"), seed("eventory-2c")],
  },
  {
    id: "s3",
    title: "사격게임기",
    description: "지역 축제 게임존",
    tags: ["사격게임기", "축제", "게임존"],
    images: [seed("eventory-3a"), seed("eventory-3b"), seed("eventory-3c"), seed("eventory-3d")],
  },
  {
    id: "s4",
    title: "가챠머신",
    description: "백화점 팝업스토어 이벤트",
    tags: ["가챠머신", "백화점", "팝업스토어"],
    images: [seed("eventory-4a"), seed("eventory-4b"), seed("eventory-4c")],
  },
  {
    id: "s5",
    title: "룰렛",
    description: "브랜드 프로모션 행사",
    tags: ["룰렛", "브랜드", "프로모션"],
    images: [seed("eventory-5a"), seed("eventory-5b"), seed("eventory-5c"), seed("eventory-5d")],
  },
  {
    id: "s6",
    title: "에어볼추첨기",
    description: "전시회 경품 추첨 부스",
    tags: ["에어볼추첨기", "전시회", "경품추첨"],
    images: [seed("eventory-6a"), seed("eventory-6b"), seed("eventory-6c")],
  },
];

// 장비별 스펙 (임의 placeholder — 실제 값으로 교체하세요)
const CUSTOM = "브랜드 로고 및 디자인(랩핑) 적용 가능";

const DEFAULT_SPECS = [
  { label: "기기 사이즈", value: "W 500 × D 500 × H 1600 mm" },
  { label: "운영 전력", value: "전압 220V / 소비전력 약 200W" },
  { label: "맞춤 제작", value: CUSTOM },
];

export const MACHINE_SPECS = {
  "가챠머신": [
    { label: "기기 사이즈", value: "W 500 × D 500 × H 1600 mm" },
    { label: "운영 전력", value: "전압 220V / 소비전력 약 200W" },
    { label: "맞춤 제작", value: CUSTOM },
  ],
  "에어볼추첨기": [
    { label: "기기 사이즈", value: "W 600 × D 600 × H 1700 mm" },
    { label: "운영 전력", value: "전압 220V / 소비전력 약 200W" },
    { label: "맞춤 제작", value: CUSTOM },
  ],
  "스톱워치": [
    { label: "기기 사이즈", value: "W 400 × D 400 × H 1500 mm" },
    { label: "운영 전력", value: "전압 220V / 소비전력 약 150W" },
    { label: "맞춤 제작", value: CUSTOM },
  ],
  "룰렛": [
    { label: "기기 사이즈", value: "W 700 × D 700 × H 1700 mm" },
    { label: "운영 전력", value: "전압 220V / 소비전력 약 200W" },
    { label: "맞춤 제작", value: CUSTOM },
  ],
  "사격게임기": [
    { label: "기기 사이즈", value: "W 1200 × D 800 × H 1900 mm" },
    { label: "운영 전력", value: "전압 220V / 소비전력 약 300W" },
    { label: "맞춤 제작", value: CUSTOM },
  ],
  "핀볼게임": [
    { label: "기기 사이즈", value: "W 700 × D 500 × H 1300 mm" },
    { label: "운영 전력", value: "전압 220V / 소비전력 약 200W" },
    { label: "맞춤 제작", value: CUSTOM },
  ],
};

// 제목(장비명)으로 스펙 조회 (없으면 기본 placeholder)
export function getMachineSpecs(title) {
  return MACHINE_SPECS[title] || DEFAULT_SPECS;
}

// 장비명/카테고리명의 기본 스펙을 "라벨: 값" 텍스트로 (관리자 입력 기본값용)
export function getMachineSpecsText(name) {
  const arr = MACHINE_SPECS[name] || DEFAULT_SPECS;
  return arr.map((s) => `${s.label}: ${s.value}`).join("\n");
}

// "라벨: 값" 텍스트를 [{label, value}] 배열로 파싱 (상세 표시용)
export function parseSpecsText(text) {
  if (!text || !text.trim()) return null;
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      if (i === -1) return { label: "", value: l };
      return { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
    });
}

// 카드(목록)용 정규화: 썸네일 1장 + 메타
export function normalizeCases(cases) {
  if (cases && cases.length > 0) {
    return cases.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      image: c.image_url,
      tags: c.tags,
    }));
  }
  return SAMPLE_CASES.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    image: s.images[0],
    tags: s.tags,
  }));
}

// 상세용: 샘플 id로 찾기 (없으면 null)
export function getSampleCaseById(id) {
  return SAMPLE_CASES.find((s) => s.id === id) || null;
}
