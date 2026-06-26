"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVER_FORM_URL } from "@/lib/constants";
import LogoAnimated from "@/components/LogoAnimated";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/products", label: "장비" },
  { href: "/cases", label: "행사사례" },
  { href: "/about", label: "회사소개" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const quoteHref = NAVER_FORM_URL || "/about";
  const quoteProps = NAVER_FORM_URL
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

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
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <LogoAnimated />

        <div className="flex shrink-0 items-center gap-3 pl-3">
          <a
            href={quoteHref}
            {...quoteProps}
            className="whitespace-nowrap rounded-full bg-ink px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-black active:scale-[0.98]"
          >
            견적문의
          </a>

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
        className={`fixed right-0 top-0 z-[60] flex h-full w-72 max-w-[82vw] flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-ink/5 px-5">
          <span className="font-logo text-xl font-extrabold tracking-tight text-ink">
            EVENTORY
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

        <nav className="flex flex-col px-5 py-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`border-b border-ink/5 py-4 text-[15px] font-medium transition last:border-0 hover:text-primary ${
                  active ? "text-primary" : "text-ink/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <a
          href={quoteHref}
          {...quoteProps}
          onClick={() => setOpen(false)}
          className="mx-5 mt-3 rounded-full bg-ink px-4 py-3 text-center text-sm font-bold text-white"
        >
          견적문의
        </a>
      </aside>
    </header>
  );
}
