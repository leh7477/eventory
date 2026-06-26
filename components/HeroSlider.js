import Image from "next/image";
import { SITE } from "@/lib/constants";
import QuoteButton from "@/components/QuoteButton";

// 배너가 없을 때 보여줄 데모 폴백 슬라이드 4종 (브랜드 톤: 코랄·핑크·플럼 계열로 통일)
const FALLBACKS = [
  "bg-gradient-to-br from-[#FF7A59] to-[#FF4D8D]",
  "bg-gradient-to-br from-[#C04A6A] to-[#5B2A48]",
  "bg-gradient-to-br from-[#7A2F5A] to-[#2B2233]",
  "bg-gradient-to-br from-[#E8345A] to-[#9B3B6E]",
];

export default function HeroSlider({ banners = [] }) {
  const hasBanners = banners.length > 0;
  // 마퀴 seamless 루프를 위해 슬라이드를 2배로 복제
  const slides = hasBanners ? banners : FALLBACKS.map((bg, i) => ({ id: `fb-${i}`, bg }));
  const loop = [...slides, ...slides];

  return (
    <section className="relative h-[82vh] min-h-[520px] w-full overflow-hidden bg-ink">
      {/* 흐르는 사진 트랙 */}
      <div className="absolute inset-0 flex w-max animate-hero-marquee">
        {loop.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            className="relative h-full w-[85vw] shrink-0 sm:w-[48vw] lg:w-[38vw]"
          >
            {s.image_url ? (
              <Image
                src={s.image_url}
                alt={s.title ?? "행사 장비"}
                fill
                priority={i === 0}
                sizes="(max-width: 640px) 85vw, (max-width: 1024px) 48vw, 38vw"
                className="object-cover"
              />
            ) : (
              <div className={`flex h-full w-full items-center justify-center ${s.bg}`}>
                <span className="font-heading text-xs font-bold tracking-[0.4em] text-white/25">
                  SAMPLE {String((i % FALLBACKS.length) + 1).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 가독성 오버레이 (데모 슬라이드가 보이도록 옅게) */}
      <div className="absolute inset-0 bg-ink/25" />
      <div className="absolute inset-0 overlay-gradient" />

      {/* 텍스트 */}
      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-start justify-end px-6 pb-16 text-white sm:pb-20">
        <p className="font-heading text-sm font-bold tracking-[0.35em] text-white/70 sm:text-base">
          EVENTORY
        </p>
        <p className="mt-1.5 font-heading text-base font-semibold tracking-wide text-white/85 sm:text-lg">
          Every Event Has a Story
        </p>
        <h1 className="mt-1 max-w-3xl text-balance font-handwriting text-4xl leading-[1.2] sm:text-6xl">
          이벤트를 완성하는 모든 순간
        </h1>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <QuoteButton variant="light" />
          <a
            href={`tel:${SITE.phone}`}
            className="rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            {SITE.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
