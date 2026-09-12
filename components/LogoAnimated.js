import Link from "next/link";

// 상단 로고 — EVENTLAND 정적 표시
export default function LogoAnimated() {
  return (
    <Link
      href="/"
      className="font-logo text-2xl font-extrabold tracking-tight text-ink sm:text-4xl"
    >
      EVENTLAND
    </Link>
  );
}
