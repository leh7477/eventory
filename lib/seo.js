// Stories 상세 하단 안내 문단 (검색 노출용) — 자동 생성 템플릿
// 관리자에서 직접 입력하면 그 값을 쓰고, 없으면 아래 자동 문단을 사용합니다.

function hashIndex(str, mod) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

// name = 장비명. "\n"은 지정 줄바꿈(단어 잘림 방지)
export function seoBodyVariants(name) {
  return [
    [
      `행사의 인상은 참여자가 직접 경험한 순간에서 만들어집니다. ${name}는 관람객의 발길을 붙잡고 자연스러운 참여와 촬영을 이끌어내는 이벤트 콘텐츠로, 팝업스토어와 기업 행사·박람회, 전시 부스, 지역 축제, 브랜드 프로모션 등 다양한 현장에서 활용됩니다.`,
      `이벤토리(EVENTORY)는 행사 성격과 공간, 참여 인원에 맞춰 ${name} 렌탈·대여 구성을 제안하고,\n브랜드 로고와 컬러를 입힌 랩핑(풀 커스텀)으로 ${name} 맞춤 제작까지 진행합니다. 대형 ${name} 제작이 필요한 경우도 상담 가능합니다.`,
      `모든 장비는 사전 점검을 거쳐 준비되며, 브랜드 아이덴티티를 살린 디자인으로 행사장의 몰입도를 높여드립니다. ${name}렌탈, ${name}대여, ${name}임대, ${name}제작 문의는 아래 견적 문의로 편하게 남겨주세요.`,
    ],
    [
      `기억에 남는 행사는 참여자가 직접 겪은 경험에서 시작됩니다. ${name}는 부스로 사람을 모으고 대기 줄까지 콘텐츠로 만들어 주는 참여형 아이템으로, 신제품 런칭과 오픈 이벤트, 사내 행사, 페스티벌 등 폭넓은 현장에 어울립니다.`,
      `이벤토리는 ${name} 대여부터 시작해 행사 콘셉트에 맞춘 브랜드 래핑과 ${name} 맞춤 제작까지 한 번에 준비합니다. 표준형 ${name}렌탈은 물론 대형 사이즈나 특수 규격의 ${name}제작도 문의하실 수 있습니다.`,
      `장비는 출고 전 점검을 마쳐 현장에서 안정적으로 운영되며, 공간과 예산에 맞는 구성으로 제안드립니다. ${name}렌탈, ${name}대여, ${name}임대, ${name}제작이 필요하시면 견적 문의로 알려 주세요.`,
    ],
    [
      `좋은 행사는 규모보다 참여자가 남기는 경험으로 완성됩니다. ${name}는 관람객이 직접 참여하고 사진을 남기게 만드는 이벤트 장비로, 팝업스토어와 전시회, 기업 프로모션, 지역 축제 현장에서 꾸준히 활용되고 있습니다.`,
      `이벤토리(EVENTORY)는 ${name} 렌탈·대여는 물론 브랜드 로고와 디자인을 입힌 커스텀 래핑, 그리고 ${name} 맞춤 제작을 함께 제공합니다. 행사 규모가 크다면 대형 ${name} 제작으로도 대응합니다.`,
      `모든 ${name}는 사전 점검 후 준비되어 현장에서 안정적으로 운영됩니다. ${name}렌탈, ${name}대여, ${name}임대, ${name}제작 관련 문의는 아래 견적 문의로 남겨 주세요.`,
    ],
  ];
}

// 상세 페이지용: 사례별 버전 순환 → 문단 배열
export function autoSeoBody(name, id) {
  const v = seoBodyVariants(name);
  return v[hashIndex(id || name, v.length)];
}

// 관리자 기본값(편집 시작점) — 문단 사이 빈 줄로 이어붙인 텍스트
export function defaultSeoBodyText(name) {
  return seoBodyVariants(name)[0].join("\n\n");
}

// 저장된 텍스트 → 문단 배열 (빈 줄 기준)
export function parseSeoBody(text) {
  if (!text || !text.trim()) return null;
  return text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}
