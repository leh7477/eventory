// 카테고리 기본 아이콘 (관리자가 이미지를 올리지 않았을 때의 폴백).
// 실물 사진이 아닌 2색 플랫 로고 스타일. 이름에 키워드가 없으면 null → 첫 글자 타일로 대체됨.

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// 가챠머신 — 유리돔 + 본체 + 배출구
function Gacha() {
  return (
    <>
      <path {...S} d="M14 22a10 10 0 0 1 20 0" />
      <circle cx="24" cy="16" r="3" className="fill-primary" stroke="none" />
      <path {...S} d="M13 22h22v18a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2z" />
      <circle cx="19" cy="29" r="2" className="fill-primary" stroke="none" />
      <rect {...S} x="21" y="33" width="10" height="6" rx="1.5" />
    </>
  );
}

// 에어볼추첨기 — 투명 구체 안의 볼 + 받침
function AirBall() {
  return (
    <>
      <circle {...S} cx="24" cy="21" r="12" />
      <circle cx="20" cy="19" r="3" className="fill-primary" stroke="none" />
      <circle cx="27" cy="24" r="2.5" className="fill-accent" stroke="none" />
      <circle cx="27" cy="16" r="1.8" className="fill-accent" stroke="none" />
      <path {...S} d="M18 33h12M24 33v6M17 41h14" />
    </>
  );
}

// 스톱워치 — 다이얼 + 버튼 + 바늘
function Stopwatch() {
  return (
    <>
      <circle {...S} cx="24" cy="27" r="14" />
      <path {...S} d="M20 7h8M24 7v5" />
      <path {...S} d="M35 16l3-3" />
      <path
        d="M24 19v8h6"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-primary"
      />
    </>
  );
}

// 룰렛 — 6분할 휠 + 상단 포인터
function Roulette() {
  return (
    <>
      <circle {...S} cx="24" cy="26" r="14" />
      <path
        d="M24 26 L24 12 A14 14 0 0 1 36.1 19 Z M24 26 L29.9 38.1 A14 14 0 0 1 17.9 38.1 Z M24 26 L11.9 19 A14 14 0 0 1 18.1 12.9 Z"
        className="fill-primary"
        stroke="none"
      />
      <circle cx="24" cy="26" r="2.5" className="fill-accent" stroke="none" />
      <path d="M24 6l3.5 5h-7z" className="fill-ink" stroke="none" />
    </>
  );
}

// 사격게임기 — 과녁 + 조준선
function Shooting() {
  return (
    <>
      <circle {...S} cx="24" cy="24" r="14" />
      <circle {...S} cx="24" cy="24" r="8" />
      <circle cx="24" cy="24" r="3" className="fill-primary" stroke="none" />
      <path {...S} d="M24 4v6M24 38v6M4 24h6M38 24h6" />
    </>
  );
}

// 핀볼게임 — 필드 + 볼 + 플리퍼
function Pinball() {
  return (
    <>
      <rect {...S} x="11" y="7" width="26" height="34" rx="4" />
      <circle cx="19" cy="18" r="3" className="fill-primary" stroke="none" />
      <circle cx="29" cy="26" r="2.2" className="fill-accent" stroke="none" />
      <path {...S} d="M16 32l5 4M32 32l-5 4" />
    </>
  );
}

// 이름 → 아이콘 (키워드 포함 여부로 매칭)
const RULES = [
  [["가챠", "가차", "뽑기", "캡슐"], Gacha],
  [["에어볼", "추첨"], AirBall],
  [["스톱워치", "타이머", "스탑워치"], Stopwatch],
  [["룰렛"], Roulette],
  [["사격", "슈팅", "과녁", "다트"], Shooting],
  [["핀볼"], Pinball],
];

export default function CategoryIcon({ name = "", className = "" }) {
  const key = name.replace(/\s/g, "");
  const hit = RULES.find(([words]) => words.some((w) => key.includes(w)));

  // 매칭되는 아이콘이 없으면 이름 첫 글자로 대체 (카테고리를 새로 추가해도 깨지지 않게)
  if (!hit) {
    return (
      <span className="font-heading text-2xl font-bold text-ink/70">
        {name.slice(0, 1)}
      </span>
    );
  }

  const Shape = hit[1];
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <Shape />
    </svg>
  );
}
