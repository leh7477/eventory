import Link from "next/link";
import { SITE } from "@/lib/constants";
import LogoAnimated from "@/components/LogoAnimated";

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-white text-ink/55">
      <div className="mx-auto max-w-[1440px] px-5 py-5">
        <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          {/* 로고 — 상단 헤더와 동일한 워드마크로 통일 */}
          <div className="shrink-0">
            <LogoAnimated />
          </div>
          <p className="text-xs text-ink/55">
            상호 <span className="text-ink">{SITE.nameKo}</span> · 사업자등록번호{" "}
            <span className="text-ink">{SITE.bizNumber}</span> · 전화{" "}
            <a href={`tel:${SITE.phone}`} className="text-ink hover:underline">
              {SITE.phone}
            </a>{" "}
            · 이메일{" "}
            <a href={`mailto:${SITE.email}`} className="text-ink hover:underline">
              {SITE.email}
            </a>
          </p>
        </div>
        {/* 개인정보처리방침은 법상 공개 의무 — 항상 클릭 가능해야 하므로
            우하단 떠있는 문의 버튼과 겹치지 않도록 왼쪽에 배치 */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
          <Link
            href="/privacy"
            className="text-[11px] font-bold text-ink/60 underline underline-offset-2 hover:text-ink"
          >
            개인정보처리방침
          </Link>
          <span className="text-[11px] text-ink/20">·</span>
          <p className="text-[11px] text-ink/35">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
