import Link from "next/link";

// 상단 로고 — EVENT LAND, 테슬라풍 와이드 워드마크(Michroma)
export default function LogoAnimated() {
  return (
    <Link
      href="/"
      aria-label="EVENT LAND 홈"
      className="font-tesla whitespace-nowrap text-lg font-semibold tracking-[0.32em] text-ink sm:text-xl sm:tracking-[0.4em]"
    >
      EVENT LAND
    </Link>
  );
}
