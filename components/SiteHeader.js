"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVER_FORM_URL } from "@/lib/constants";

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

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="font-heading text-2xl tracking-[0.2em] text-gold">
          EVENTORY
        </Link>

        {/* 데스크탑 네비 */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition hover:text-gold ${
                  active ? "text-gold" : "text-white/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={quoteHref}
            {...quoteProps}
            className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-navy transition hover:brightness-95"
          >
            견적문의
          </a>
        </nav>

        {/* 모바일 햄버거 */}
        <button
          type="button"
          aria-label="메뉴 열기"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col gap-1.5 p-2 md:hidden"
        >
          <span
            className={`h-0.5 w-6 bg-white transition ${
              open ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-white transition ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-white transition ${
              open ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* 모바일 메뉴 패널 */}
      {open && (
        <div className="border-t border-white/10 bg-navy md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-5 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-white/80 hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={quoteHref}
              {...quoteProps}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-gold px-4 py-2 text-center text-sm font-bold text-navy"
            >
              견적문의
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
