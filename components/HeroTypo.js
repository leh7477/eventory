"use client";

import Link from "next/link";

// 사진 없이 거대 타이포로 한 화면을 꽉 채우는 히어로 (자료가 없을 때).
// 가운데 정렬 워드마크 + 아래 통통 튀는 스크롤 화살표. 크림 배경 + 코랄 포인트.
// 문구는 관리자(settings)에서 편집. 값 없으면 아래 기본값 사용.
const DEFAULT_WORDMARK = "EVENT LAND";
const DEFAULT_SUBTITLE = "Every Event Has a Story";
const DEFAULT_SUBLIST =
  "가챠머신 · 에어볼추첨기 · 스톱워치 · 룰렛 · 사격게임 · 핀볼게임";

export default function HeroTypo({ wordmark, subtitle, sublist } = {}) {
  const wm = (wordmark || DEFAULT_WORDMARK).trim();
  const sub = subtitle ?? DEFAULT_SUBTITLE;
  const list = sublist ?? DEFAULT_SUBLIST;

  const scrollDown = () =>
    window.scrollTo({ top: window.innerHeight * 0.9, behavior: "smooth" });

  return (
    <section className="relative flex h-[calc(100svh-5rem)] min-h-[520px] w-full flex-col items-center justify-center overflow-hidden bg-white px-6 text-center">
      {/* 거대 워드마크 (한 줄) — 글자마다 시차를 두고 위아래로 톡톡 튀김 */}
      <h1 className="hero-typo-line whitespace-nowrap text-[12vw] leading-none tracking-tight text-ink lg:text-[clamp(7rem,13.5vw,12.5rem)]">
        {wm.split("").map((ch, i, arr) => (
          <span
            key={i}
            className="hero-letter inline-block"
            // 앞→뒤 방향으로 순차적으로 튀도록 시차를 양수로 부여
            style={{ ["--d"]: `${(i * 0.11).toFixed(2)}s` }}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}
      </h1>

      {/* 서브 문구 */}
      {sub && (
        <p className="hero-typo-line mt-7 font-heading text-lg font-bold tracking-wide text-ink sm:mt-9 sm:text-2xl">
          {sub}
        </p>
      )}
      {list && (
        <p className="hero-typo-line mt-2.5 text-sm text-ink/60 sm:text-lg">
          {list}
        </p>
      )}

      {/* 가운데 CTA — 테슬라 '주문하기'처럼 히어로 중앙에 배치 */}
      <div className="hero-typo-line mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
        <Link
          href="/contact"
          className="min-w-[160px] rounded-full bg-ink px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black active:scale-[0.98]"
        >
          견적문의
        </Link>
        <Link
          href="/cases"
          className="min-w-[160px] rounded-full border border-ink/20 bg-white/70 px-8 py-3 text-sm font-bold text-ink backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
        >
          행사 사례
        </Link>
      </div>

      {/* 스크롤 유도 화살표 (아래로 통통) */}
      <button
        type="button"
        onClick={scrollDown}
        aria-label="아래 내용 보기"
        className="hero-arrow absolute bottom-8 left-1/2 flex h-16 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black sm:bottom-10"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v16M6 13l6 6 6-6" />
        </svg>
      </button>
    </section>
  );
}
