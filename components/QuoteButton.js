import Link from "next/link";
import { NAVER_FORM_URL } from "@/lib/constants";

// variant: "gradient"(기본, festive) | "light"(어두운 배경용 흰 버튼) | "dark"(밝은 배경용 검정 버튼)
const VARIANTS = {
  gradient:
    "bg-festive text-white shadow-md shadow-primary/30 hover:brightness-105",
  light: "bg-white text-ink shadow-md hover:bg-white/90",
  dark: "bg-ink text-white shadow-md hover:bg-black",
};

export default function QuoteButton({
  className = "",
  variant = "gradient",
  children,
}) {
  const label = children ?? "견적 문의하기";
  const base =
    "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition active:scale-[0.98]";
  const styles = `${base} ${VARIANTS[variant] ?? VARIANTS.gradient} ${className}`;

  if (NAVER_FORM_URL) {
    return (
      <a
        href={NAVER_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href="/about" className={styles}>
      {label}
    </Link>
  );
}
