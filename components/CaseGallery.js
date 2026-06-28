"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DragScroll from "@/components/DragScroll";

// items: [{ id, title, description, image, tags }]
// layout: "row"(기본) | "grid"
// mode (row 전용): "off"(드래그) | "marquee"(연속 흐름) | "carousel"(3장씩 슬라이드)
function CaseCard({ c, className, grid }) {
  return (
    <Link href={`/cases/${c.id}`} className={`group block ${className}`}>
      <div
        className={`relative aspect-square overflow-hidden ${
          grid ? "bg-ink/5" : "rounded-xl bg-cream"
        }`}
      >
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image}
            alt={c.title}
            draggable={false}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-festive">
            <span className="font-heading font-bold tracking-widest text-white/80">
              EVENTORY
            </span>
          </div>
        )}
      </div>
      <h3 className={`text-center font-semibold text-ink ${grid ? "mt-4" : "mt-3"} text-sm sm:text-base`}>
        {c.title}
      </h3>
      {c.description && (
        <p className="mt-1 line-clamp-1 text-center text-xs text-ink/55 sm:text-sm">
          {c.description}
        </p>
      )}
    </Link>
  );
}

export default function CaseGallery({ items = [], layout = "row", mode = "off", speed = 30 }) {
  if (layout === "grid") {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3">
        {items.map((c) => (
          <CaseCard key={c.id} c={c} grid className="w-full" />
        ))}
      </div>
    );
  }

  if (mode === "marquee" && items.length > 0) {
    const loop = [...items, ...items];
    return (
      <div className="overflow-hidden">
        <div
          className="flex w-max animate-hero-marquee gap-4"
          style={{ animationDuration: `${speed}s` }}
        >
          {loop.map((c, i) => (
            <CaseCard key={`${c.id}-${i}`} c={c} className="w-[260px] shrink-0 sm:w-[330px]" />
          ))}
        </div>
      </div>
    );
  }

  if (mode === "carousel" && items.length > 0) {
    return <CaseCarousel items={items} speed={speed} />;
  }

  return (
    <DragScroll className="flex gap-4 pb-2">
      {items.map((c) => (
        <CaseCard
          key={c.id}
          c={c}
          className="shrink-0 basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)]"
        />
      ))}
    </DragScroll>
  );
}

// 3장씩(모바일 2장) 한 페이지 단위로 자동 전환되는 캐러셀
function CaseCarousel({ items, speed }) {
  const [perView, setPerView] = useState(3);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const calc = () => setPerView(window.innerWidth < 640 ? 2 : 3);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / perView));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  useEffect(() => {
    if (paused || totalPages <= 1) return;
    const interval = Math.max(2, Math.round(speed / 7)) * 1000; // 마퀴 속도 → 캐러셀 간격 환산
    const t = setInterval(() => setPage((p) => (p + 1) % totalPages), interval);
    return () => clearInterval(t);
  }, [speed, totalPages, paused]);

  const step = 100 / perView;
  const maxStart = Math.max(0, items.length - perView);
  const startIndex = Math.min(page * perView, maxStart);
  const tx = -(startIndex * step);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(${tx}%)` }}
        >
          {items.map((c) => (
            <div key={c.id} className="shrink-0 px-2" style={{ flex: `0 0 ${step}%` }}>
              <CaseCard c={c} className="w-full" />
            </div>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`${i + 1}페이지`}
              className={`h-2 rounded-full transition-all ${
                i === page ? "w-6 bg-ink" : "w-2 bg-ink/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
