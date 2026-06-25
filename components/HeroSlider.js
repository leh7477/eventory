"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SITE } from "@/lib/constants";
import QuoteButton from "@/components/QuoteButton";

export default function HeroSlider({ banners = [] }) {
  const [index, setIndex] = useState(0);
  const hasBanners = banners.length > 0;

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const current = hasBanners ? banners[index] : null;

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-ink">
      {/* 배경 이미지 슬라이드 */}
      {hasBanners ? (
        banners.map((b, i) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={b.image_url}
              alt={b.title ?? "배너"}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-[#4a2a44] to-ink" />
      )}

      {/* 가독성 오버레이 */}
      <div className="absolute inset-0 overlay-gradient" />

      {/* 텍스트 */}
      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-start justify-center px-6 text-white">
        <p className="font-heading text-xl font-bold tracking-[0.2em] text-accent sm:text-2xl">
          EVENTORY
        </p>
        <h1 className="mt-3 max-w-2xl text-balance text-3xl font-bold leading-tight sm:text-5xl">
          {current?.title ?? "이벤트의 완성, 장비 렌탈"}
        </h1>
        <p className="mt-4 max-w-xl text-balance text-base text-white/80 sm:text-lg">
          {current?.subtitle ??
            "가챠머신부터 룰렛·사격게임기까지, 행사에 필요한 모든 장비를 한 곳에서."}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <QuoteButton />
          <a
            href={`tel:${SITE.phone}`}
            className="rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:border-accent hover:text-accent"
          >
            {SITE.phone}
          </a>
        </div>
      </div>

      {/* 인디케이터 */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`${i + 1}번 배너`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-accent" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
