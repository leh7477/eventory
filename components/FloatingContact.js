"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/constants";

// 전 페이지 공통 플로팅 연락 버튼 (관리자 영역에서는 숨김)
export default function FloatingContact() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const tel = (SITE.phone || "").replace(/[^0-9]/g, "");

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-stretch gap-2.5 sm:bottom-7 sm:right-6">
      {/* 전화 문의 */}
      {tel && (
        <a
          href={`tel:${tel}`}
          aria-label="전화 문의"
          className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-bold text-ink shadow-lg ring-1 ring-ink/10 transition hover:-translate-y-0.5 hover:shadow-xl sm:px-6 sm:py-4 sm:text-base"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          전화 문의
        </a>
      )}

      {/* 견적 문의 */}
      <Link
        href="/contact"
        aria-label="견적 문의"
        className="flex items-center justify-center gap-2 rounded-full bg-festive px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:px-6 sm:py-4 sm:text-base"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        견적 문의
      </Link>
    </div>
  );
}
