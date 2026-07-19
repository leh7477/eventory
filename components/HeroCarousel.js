"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import HeroCopy from "@/components/HeroCopy";

const INTERVAL = 5000;

// 대형 배너가 한 장씩 옆으로 넘어감 (사진이 4~5장 있을 때)
export default function HeroCarousel({ slides = [] }) {
  const [index, setIndex] = useState(0);
  // 동작 줄이기 설정이면 자동 넘김은 유지하되 미끄러지는 전환만 끔
  // (넘김까지 막으면 그 설정을 쓰는 방문자는 배너를 1장만 보게 됨)
  const [reduced, setReduced] = useState(false);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setIndex((v) => (v + 1) % count), INTERVAL);
    return () => clearInterval(t);
  }, [count]);

  return (
    <section className="relative h-[82vh] min-h-[520px] w-full overflow-hidden bg-ink">
      {/* 슬라이드 트랙 */}
      <div
        className={`absolute inset-0 flex ${
          reduced
            ? ""
            : "transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
        }`}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div key={`${s.id}-${i}`} className="relative h-full w-full shrink-0">
            {s.image_url ? (
              <Image
                src={s.image_url}
                alt={s.title ?? "행사 현장"}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div className={`h-full w-full ${s.bg}`} />
            )}
          </div>
        ))}
      </div>

      {/* 가독성 오버레이 (워시 없이, 글자 부분만 어둡게) */}
      <div className="absolute inset-0 bg-ink/25" />
      <div className="absolute inset-0 overlay-gradient" />

      <HeroCopy tone="light" />

      {/* 인디케이터 */}
      {count > 1 && (
        <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-9">
          {slides.map((s, i) => (
            <button
              key={`dot-${s.id}-${i}`}
              type="button"
              aria-label={`${i + 1}번째 배너 보기`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
