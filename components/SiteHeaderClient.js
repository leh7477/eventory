"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoAnimated from "@/components/LogoAnimated";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

// 보조 메뉴 (드로어 하단)
const SECONDARY = [
  { href: "/cases", label: "행사 사례" },
  { href: "/about", label: "회사소개" },
];

export default function SiteHeaderClient({ categories = [] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 카테고리 메뉴 (DB 우선, 없으면 기본값)
  const cats =
    categories.length > 0
      ? categories.map((c) => ({ label: c.name, href: `/cases?category=${c.id}` }))
      : DEFAULT_CATEGORIES.map((n) => ({ label: n, href: "/cases" }));

  // 드로어 열렸을 때 body 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const onKey = (e) => e.key === "Escape" && setOpen(false);
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          {/* 좌: 로고 */}
          <div className="shrink-0">
            <LogoAnimated />
          </div>

          {/* 중앙: 카테고리 메뉴 (테슬라식 와이드 간격) — 로고·액션 사이 공간에서 중앙정렬 */}
          <nav className="hidden flex-1 items-center justify-center gap-8 xl:flex 2xl:gap-12">
            {cats.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="whitespace-nowrap text-sm font-semibold tracking-wide text-ink/80 transition hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 우: 액션 */}
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/contact"
              className="hidden whitespace-nowrap rounded-full bg-ink px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-black active:scale-[0.98] sm:inline-block"
            >
              견적문의
            </Link>

            {/* 햄버거 → 우측 드로어 열기 */}
            <button
              type="button"
              aria-label="메뉴 열기"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full transition hover:bg-ink/5"
            >
              <span className="h-0.5 w-6 bg-ink" />
              <span className="h-0.5 w-6 bg-ink" />
              <span className="h-0.5 w-6 bg-ink" />
            </button>
          </div>
        </div>
      </header>

      {/* 배경 딤 */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-ink/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      />

      {/* 우측 드로어 */}
      <aside
        className={`fixed inset-y-0 right-0 z-[60] flex w-72 max-w-[82vw] flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-ink/5 px-5">
          <span className="font-tesla text-sm tracking-[0.3em] text-ink">
            EVENT LAND
          </span>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-ink/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* 카테고리 */}
          <p className="px-5 pt-4 text-xs font-bold tracking-widest text-ink/40">
            장비 카테고리
          </p>
          <nav className="flex flex-col px-5">
            {cats.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-ink/5 py-3.5 text-base font-semibold text-ink transition last:border-0 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 보조 메뉴 */}
          <nav className="mt-2 flex flex-col border-t border-ink/10 px-5 pt-2">
            {SECONDARY.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`py-3 text-sm font-semibold transition hover:text-primary ${
                    active ? "text-primary" : "text-ink/70"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Link
          href="/contact"
          onClick={() => setOpen(false)}
          className="mx-5 mb-5 mt-3 rounded-full bg-ink px-4 py-3 text-center text-sm font-bold text-white"
        >
          견적문의
        </Link>
      </aside>
    </>
  );
}
