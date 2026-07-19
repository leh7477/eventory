import Image from "next/image";
import HeroCopy from "@/components/HeroCopy";
import HeroCarousel from "@/components/HeroCarousel";

// 배너가 없을 때 보여줄 데모 폴백 슬라이드 4종 (브랜드 톤: 코랄·핑크·플럼 계열로 통일)
const FALLBACKS = [
  "bg-gradient-to-br from-[#FF7A59] to-[#FF4D8D]",
  "bg-gradient-to-br from-[#C04A6A] to-[#5B2A48]",
  "bg-gradient-to-br from-[#7A2F5A] to-[#2B2233]",
  "bg-gradient-to-br from-[#E8345A] to-[#9B3B6E]",
];

// 사진 한 장을 밝게 흐려서 깔고 그 위에 진한 글자 (사진이 적을 때)
function StaticHero({ slide }) {
  return (
    <section className="relative h-[82vh] min-h-[520px] w-full overflow-hidden bg-cream">
      {slide?.image_url ? (
        <Image
          src={slide.image_url}
          alt={slide.title ?? "행사 현장"}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFE3D6] to-[#FFD3E2]" />
      )}

      {/* 밝은 워시 — 사진은 분위기만 남김 */}
      <div className="absolute inset-0 bg-cream/80" />

      <HeroCopy tone="dark" />
    </section>
  );
}

// 사진이 옆으로 계속 흐름 (사진이 여러 장 쌓였을 때)
function MarqueeHero({ slides }) {
  // 마퀴 seamless 루프를 위해 슬라이드를 2배로 복제
  const loop = [...slides, ...slides];

  return (
    <section className="relative h-[82vh] min-h-[520px] w-full overflow-hidden bg-ink">
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

      <HeroCopy tone="light" />
    </section>
  );
}

// mode: "static"(한 장 흐리게) | "slide"(대형 배너 전환) | "marquee"(옆으로 흐름)
// 관리자 > 메인 배너에서 전환
export default function HeroSlider({ banners = [], mode = "static" }) {
  const slides =
    banners.length > 0
      ? banners
      : FALLBACKS.map((bg, i) => ({ id: `fb-${i}`, bg }));

  if (mode === "marquee") return <MarqueeHero slides={slides} />;
  if (mode === "slide") return <HeroCarousel slides={slides} />;
  return <StaticHero slide={banners[0] ?? null} />;
}
