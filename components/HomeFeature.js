"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SITE } from "@/lib/constants";

// 히어로 아래 대표 장비 캐러셀 (Tesla 홈 느낌) — 화살표/점으로 이동, 좌우 여백·간격 유지
// items: [{ name, tagline, bg?(gradient class), image?(url) }]
export default function HomeFeature({ items = [] }) {
  const scroller = useRef(null);
  const [idx, setIdx] = useState(0);
  if (!items.length) return null;

  const goTo = (i) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    const card = el.children[clamped];
    if (card) {
      const left = card.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
    setIdx(clamped);
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    [...el.children].forEach((c, i) => {
      const cc = c.offsetLeft + c.clientWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setIdx(best);
  };

  return (
    <section className="mx-auto max-w-[1840px] px-3 pt-6 pb-2 sm:px-5 sm:pt-8">
      <div className="relative">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 sm:gap-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((it) => (
            <article
              key={it.name}
              className={`relative flex min-h-[380px] w-[88%] shrink-0 snap-center flex-col overflow-hidden rounded-2xl sm:min-h-[60vh] sm:w-[62%] ${
                it.bg || "bg-ink"
              }`}
              style={
                it.image
                  ? {
                      backgroundImage: `url(${it.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {/* 가독성용 오버레이 */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

              {/* 상단 라벨 (좌측) */}
              <div className="relative z-10 px-7 pt-9 sm:px-10 sm:pt-11">
                <p className="text-sm font-semibold tracking-wide text-white/90 drop-shadow sm:text-base">
                  {it.tagline}
                </p>
              </div>

              {/* 하단 이름 + 버튼 (좌측) */}
              <div className="relative z-10 mt-auto px-7 pb-9 sm:px-10 sm:pb-11">
                <h3 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-6xl">
                  {it.name}
                </h3>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/contact"
                    className="min-w-[150px] rounded-full bg-white/95 px-8 py-3.5 text-center text-sm font-bold text-ink shadow transition hover:bg-white active:scale-[0.98]"
                  >
                    견적문의
                  </Link>
                  <a
                    href={`tel:${SITE.phone}`}
                    className="min-w-[150px] rounded-full border border-white/70 bg-white/10 px-8 py-3.5 text-center text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
                  >
                    전화문의
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* 화살표 */}
        <button
          type="button"
          onClick={() => goTo(idx - 1)}
          disabled={idx === 0}
          aria-label="이전"
          className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-ink/15 bg-white/85 text-lg text-ink shadow backdrop-blur transition hover:bg-white disabled:opacity-0 sm:left-6"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(idx + 1)}
          disabled={idx === items.length - 1}
          aria-label="다음"
          className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-ink/15 bg-white/85 text-lg text-ink shadow backdrop-blur transition hover:bg-white disabled:opacity-0 sm:right-6"
        >
          ›
        </button>
      </div>

      {/* 점 인디케이터 */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {items.map((it, i) => (
          <button
            key={it.name}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${i + 1}번째 장비`}
            className={`h-2 rounded-full transition-all ${
              i === idx ? "w-5 bg-ink" : "w-2 bg-ink/25 hover:bg-ink/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
