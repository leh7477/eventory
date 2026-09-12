"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_SECTIONS, ADMIN_GROUP_ORDER } from "@/lib/admin/sections";
import PasswordChangeModal from "@/components/admin/PasswordChangeModal";

export default function AdminSidebar({ email, isOwner = true, permissions = [] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const accessibleSections = ADMIN_SECTIONS.filter(
    (s) => isOwner || permissions.includes(s.key)
  );

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
    router.refresh();
  };

  const displayName = (email ?? "").replace("@eventory.local", "");

  const isActive = (href) =>
    pathname === href || pathname.startsWith(href + "/");

  const linkClass = (href) =>
    `mb-0.5 block rounded-md px-3 py-2.5 text-sm font-medium transition ${
      isActive(href) ? "bg-ink text-white" : "text-ink/70 hover:bg-ink/5"
    }`;

  // 그룹 구분: 위에 구분선 + 간격
  const groupWrap = "mt-5 border-t border-ink/10 pt-4";

  // 그룹별 아이콘 (한눈에 구분)
  const groupIcon = (group) => {
    const common = {
      width: 17,
      height: 17,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };
    if (group === "홈페이지")
      return (
        <svg {...common}>
          <path d="M3 10.5 12 4l9 6.5M5 9.5V20h5v-6h4v6h5V9.5" />
        </svg>
      );
    if (group === "운영 관리")
      return (
        <svg {...common}>
          <rect x="6" y="4" width="12" height="17" rx="2" />
          <path d="M9 4V3h6v1M9 10h6M9 14h4" />
        </svg>
      );
    // 설정
    return (
      <svg {...common}>
        <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h7M15 17h5" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="13" cy="17" r="2" />
      </svg>
    );
  };

  const groupHeader = (group) => (
    <div className="mb-2 flex items-center gap-2 px-3">
      <span className="text-primary">{groupIcon(group)}</span>
      <span className="text-sm font-bold tracking-wide text-ink/60">
        {group}
      </span>
    </div>
  );

  // 대시보드(단독) + 그룹별 메뉴 + 설정(owner)
  const navLinks = (onClick) => (
    <>
      <Link
        href="/admin/dashboard"
        onClick={onClick}
        className={linkClass("/admin/dashboard")}
      >
        대시보드
      </Link>

      {ADMIN_GROUP_ORDER.map((group) => {
        const items = accessibleSections.filter((s) => s.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className={groupWrap}>
            {groupHeader(group)}
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClick}
                className={`${linkClass(item.href)} flex items-center justify-between`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold text-ink/45">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        );
      })}

      {isOwner && (
        <div className={groupWrap}>
          {groupHeader("설정")}
          <Link
            href="/admin/accounts"
            onClick={onClick}
            className={linkClass("/admin/accounts")}
          >
            ID 관리
          </Link>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ── 모바일 상단바 ── */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink/10 bg-white px-4 md:hidden">
        <Link href="/admin/dashboard" className="font-tesla text-base font-semibold tracking-[0.28em] text-ink">
          EVENT LAND <span className="ml-1 font-sans text-xs font-bold tracking-normal text-primary">ADMIN</span>
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
            <p className="font-tesla text-base font-semibold tracking-[0.28em] text-ink">EVENT LAND</p>
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
            onClick={() => {
              setPwOpen(true);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
          >
            비밀번호 변경
          </button>
          <button
            type="button"
            onClick={logout}
            className="mt-1.5 w-full rounded-md border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 데스크탑 사이드바 ── */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink/10 bg-white md:flex">
        <div className="px-5 py-5">
          <Link href="/admin/dashboard" className="font-tesla text-lg font-semibold tracking-[0.3em] text-ink">
            EVENT LAND
          </Link>
          <p className="mt-0.5 text-xs font-semibold tracking-widest text-primary">ADMIN</p>
        </div>

        <nav className="flex-1 px-3">{navLinks()}</nav>

        <div className="border-t border-ink/10 p-4">
          <p className="truncate text-xs text-ink/50">{displayName}</p>
          <button
            type="button"
            onClick={() => {
              setPwOpen(true);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
          >
            비밀번호 변경
          </button>
          <button
            type="button"
            onClick={logout}
            className="mt-1.5 w-full rounded-md border border-ink/15 py-2 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 비밀번호 변경 */}
      {pwOpen && (
        <PasswordChangeModal email={email} onClose={() => setPwOpen(false)} />
      )}
    </>
  );
}
