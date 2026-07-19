import { SITE } from "@/lib/constants";
import QuoteButton from "@/components/QuoteButton";

// 히어로 문구 블록 — 모든 모드가 같은 위치(좌하단)를 쓰고, 배경 밝기에 따라 글자색만 달라짐
// tone: "light"(어두운 배경 위 흰 글자) | "dark"(밝은 배경 위 진한 글자)
export default function HeroCopy({ tone = "light" }) {
  const dark = tone === "dark";

  return (
    <div
      className={`relative z-10 mx-auto flex h-full max-w-6xl flex-col items-start justify-end px-6 pb-16 sm:pb-20 ${
        dark ? "text-ink" : "text-white"
      }`}
    >
      <p
        className={`font-heading text-sm font-bold tracking-[0.35em] sm:text-base ${
          dark ? "text-primary" : "text-white/70"
        }`}
      >
        EVENTORY
      </p>
      <p
        className={`mt-1.5 font-heading text-base font-semibold tracking-wide sm:text-lg ${
          dark ? "text-ink/60" : "text-white/85"
        }`}
      >
        Every Event Has a Story
      </p>
      <h1 className="mt-1 max-w-3xl text-balance font-handwriting text-4xl leading-[1.2] sm:text-6xl">
        이벤트를 완성하는 모든 순간
      </h1>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <QuoteButton variant={dark ? "dark" : "light"} />
        <a
          href={`tel:${SITE.phone}`}
          className={`rounded-full border px-6 py-3 text-sm font-medium transition ${
            dark
              ? "border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-white"
              : "border-white/40 text-white hover:border-white hover:bg-white/10"
          }`}
        >
          {SITE.phone}
        </a>
      </div>
    </div>
  );
}
