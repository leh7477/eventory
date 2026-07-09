"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/banner", label: "메인 배너" },
  { href: "/admin/categories", label: "카테고리" },
  { href: "/admin/products", label: "중단 배너" },
  { href: "/admin/cases", label: "Stories" },
  { href: "/admin/inquiries", label: "견적 문의" },
  { href: "/admin/schedule", label: "행사 일정" },
];

export default function AdminSidebar({ email }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
    router.refresh();
  };

  const displayName = (email ?? "").replace("@eventory.local", "");

  const navLinks = (onClick) =>
    NAV.map((item) => {
      const active =
        pathname === item.href || pathname.startsWith(item.href + "/");
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={`mb-0.5 block rounded-md px-3 py-2.5 text-sm font-medium transition ${
            active ? "bg-ink text-white" : "text-ink/70 hover:bg-ink/5"
          }`}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <>
      {/* ── 모바일 상단바 ── */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink/10 bg-white px-4 md:hidden">
        <Link href="/admin/dashboard" className="font-logo text-lg font-extrabold tracking-tight text-ink">
          EVENTORY <span className="text-xs font-bold text-primary">ADMIN</span>
        </Link>
        <button
          type="button"
          aria-label="메뉴 열기"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-full hover:bg-ink/5"
        >
          <span className="h-0.5 w-5 bg-ink" />
          <span className="h-0.5 w-5 bg-ink" />
          <span className="h-0.5 w-5 bg-ink" />
        </button>
      </div>

      {/* 모바일 딤 */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-ink/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      />

      {/* 모바일 드로어 */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-60 flex-col bg-white shadow-2xl transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="font-logo text-lg font-extrabold tracking-tight text-ink">EVENTORY</p>
            <p className="text-xs font-semibold tracking-widest text-primary">ADMIN</p>
          </div>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">{navLinks(() => setOpen(false))}</nav>
        <div className="border-t border-ink/10 p-4">
          <p className="truncate text-xs text-ink/50">{displayName}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-md border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 데스크탑 사이드바 ── */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink/10 bg-white md:flex">
        <div className="px-5 py-5">
          <Link href="/admin/dashboard" className="font-logo text-xl font-extrabold tracking-tight text-ink">
            EVENTORY
          </Link>
          <p className="mt-0.5 text-xs font-semibold tracking-widest text-primary">ADMIN</p>
        </div>

        <nav className="flex-1 px-3">{navLinks()}</nav>

        <div className="border-t border-ink/10 p-4">
          <p className="truncate text-xs text-ink/50">{displayName}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-md border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
          >
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
