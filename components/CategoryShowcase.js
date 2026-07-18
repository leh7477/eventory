"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";

// 카테고리 쇼케이스.
// - PC(hover 가능): 이름에 마우스를 올리면 패널이 바뀜
// - 모바일(hover 없음): 패널이 자동으로 순환하고, 이름을 탭하면 그 카테고리로 고정
// 사진(대표 사례)이 있으면 사진을, 없으면 브랜드 컬러 + 타이포만으로 채운다.
export default function CategoryShowcase({ items = [] }) {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(false); // 사용자가 직접 고르면 자동 순환 중단

  useEffect(() => {
    if (picked || items.length < 2) return;
    // hover가 되는 기기(=PC)는 마우스로 조작하므로 자동 순환 안 함
    if (window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const t = setInterval(
      () => setActive((v) => (v + 1) % items.length),
      3500
    );
    return () => clearInterval(t);
  }, [picked, items.length]);

  if (items.length === 0) return null;

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_1.15fr] lg:items-stretch lg:gap-10">
      {/* 패널 — 모바일에선 목록 위, PC에선 오른쪽 */}
      <div className="relative order-1 min-h-[300px] overflow-hidden rounded-3xl bg-festive sm:min-h-[360px] lg:order-2 lg:min-h-[420px]">
        {items.map((c, i) => (
          <div
            key={c.id}
            aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          >
            {c.image && (
              <>
                {/* 샘플이 외부 도메인이라 CaseGallery와 동일하게 plain img 사용 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-ink/55" />
              </>
            )}

            <div className="relative flex h-full flex-col justify-between p-7 sm:p-10">
              <CategoryIcon
                name={c.name}
                className="h-10 w-10 text-white/80 sm:h-12 sm:w-12"
              />

              <div>
                <p className="font-heading text-[11px] font-bold tracking-[0.35em] text-white/60 sm:text-xs">
                  EVENTORY
                </p>
                <p className="mt-2 text-3xl font-bold leading-tight text-white sm:mt-3 sm:text-4xl xl:text-5xl">
                  {c.name}
                </p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:mt-4 sm:text-base">
                  {c.tagline}
                </p>
                <Link
                  href={`/cases?category=${c.id}`}
                  tabIndex={i === active ? 0 : -1}
                  className="mt-6 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-sm font-semibold text-white sm:mt-7"
                >
                  사례 보기
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 이름 목록 */}
      <ul className="order-2 flex flex-col justify-center lg:order-1">
        {items.map((c, i) => {
          const on = i === active;
          return (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => {
                  setActive(i);
                  setPicked(true);
                }}
                aria-current={on ? "true" : undefined}
                className="flex w-full items-baseline gap-4 py-2.5 text-left outline-none lg:py-3"
              >
                <span
                  className={`font-heading text-xs tabular-nums transition-colors ${
                    on ? "text-primary" : "text-ink/25"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-2xl font-bold tracking-tight transition-all duration-300 sm:text-3xl xl:text-4xl ${
                    on ? "translate-x-1 text-ink" : "text-ink/30"
                  }`}
                >
                  {c.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
