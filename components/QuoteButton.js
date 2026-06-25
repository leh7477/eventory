import Link from "next/link";
import { NAVER_FORM_URL } from "@/lib/constants";

// 견적 문의 버튼 — 네이버폼 링크로 이동. 링크 미설정 시 회사소개 페이지로 폴백.
export default function QuoteButton({ className = "", children }) {
  const label = children ?? "견적 문의하기";
  const base =
    "inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-bold text-navy transition hover:brightness-95 active:scale-[0.98]";

  if (NAVER_FORM_URL) {
    return (
      <a
        href={NAVER_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${className}`}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href="/about" className={`${base} ${className}`}>
      {label}
    </Link>
  );
}
