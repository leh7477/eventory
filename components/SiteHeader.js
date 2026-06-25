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
    <header className="sticky top-0 z-50 border-b border-ink/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          className="font-heading text-2xl font-extrabold tracking-tight text-primary"
        >
          EVENTORY
        </Link>

        <div className="flex items-center gap-3">
          <a
            href={quoteHref}
            {...quoteProps}
            className="rounded-full bg-festive px-5 py-2 text-sm font-bold text-white shadow-sm shadow-primary/30 transition hover:brightness-105 active:scale-[0.98]"
          >
            견적문의
          </a>

          {/* 햄버거 (모든 화면에서 표시) */}
          <button
            type="button"
            aria-label="메뉴 열기"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full transition hover:bg-ink/5"
          >
            <span
              className={`h-0.5 w-6 bg-ink transition ${
                open ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-6 bg-ink transition ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-6 bg-ink transition ${
                open ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* 메뉴 패널 */}
      {open && (
        <div className="border-t border-ink/5 bg-white">
          <nav className="mx-auto flex max-w-6xl flex-col px-5 py-2">
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
                  className={`border-b border-ink/5 py-3.5 text-sm font-medium transition last:border-0 hover:text-primary ${
                    active ? "text-primary" : "text-ink/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
