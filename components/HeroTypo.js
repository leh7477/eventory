"use client";

// 사진 없이 거대 타이포로 한 화면을 꽉 채우는 히어로 (자료가 없을 때).
// 가운데 정렬 워드마크 + 아래 통통 튀는 스크롤 화살표. 크림 배경 + 코랄 포인트.
const SUBLINE = "가챠머신 · 룰렛 · 사격게임 · 팝업 · 행사 · 축제";

export default function HeroTypo() {
  const scrollDown = () =>
    window.scrollTo({ top: window.innerHeight * 0.9, behavior: "smooth" });

  return (
    <section className="relative flex h-[calc(100svh-5rem)] min-h-[520px] w-full flex-col items-center justify-center overflow-hidden bg-white px-6 text-center">
      {/* 거대 워드마크 (한 줄) — 글자마다 시차를 두고 얇아졌다 두꺼워짐 (가변폰트) */}
      <h1 className="hero-typo-line whitespace-nowrap text-[clamp(2.6rem,14.6vw,12.5rem)] leading-none tracking-tight text-ink">
        {"EVENT+STORY".split("").map((ch, i) => (
          <span
            key={i}
            className="hero-letter inline-block"
            style={{ ["--d"]: `${i * 0.09}s` }}
          >
            {ch}
          </span>
        ))}
      </h1>

      {/* 서브 문구 */}
      <p className="hero-typo-line mt-7 font-heading text-lg font-bold tracking-wide text-ink sm:mt-9 sm:text-2xl">
        Every Event Has a Story
      </p>
      <p className="hero-typo-line mt-2.5 text-sm text-ink/60 sm:text-lg">
        {SUBLINE}
      </p>

      {/* 스크롤 유도 화살표 (아래로 통통) */}
      <button
        type="button"
        onClick={scrollDown}
        aria-label="아래 내용 보기"
        className="hero-arrow absolute bottom-8 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black sm:bottom-10"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </button>
    </section>
  );
}
