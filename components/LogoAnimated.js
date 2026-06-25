"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const BASE =
  "font-heading text-2xl font-extrabold tracking-tight text-primary";

export default function LogoAnimated() {
  // step: 0(초기) → 1(EVENT) → 2(+) → 3(STORY) → 4(EVENTORY로 전환)
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // 세션당 1회만 재생, 이후엔 정적 표시
    let played = false;
    try {
      played = sessionStorage.getItem("logoPlayed") === "1";
    } catch {}
    if (played) {
      setDone(true);
      return;
    }

    const timers = [
      setTimeout(() => setStep(1), 200),
      setTimeout(() => setStep(2), 700),
      setTimeout(() => setStep(3), 1100),
      setTimeout(() => setStep(4), 1800),
      setTimeout(() => {
        setDone(true);
        try {
          sessionStorage.setItem("logoPlayed", "1");
        } catch {}
      }, 2300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (done) {
    return (
      <Link href="/" className={BASE}>
        EVENTORY
      </Link>
    );
  }

  return (
    <Link href="/" aria-label="EVENTORY" className={`relative ${BASE}`}>
      {/* 단계 A: EVENT + STORY */}
      <span
        className={`inline-flex items-center gap-1.5 transition-opacity duration-300 ${
          step >= 4 ? "opacity-0" : "opacity-100"
        }`}
      >
        <span
          className={`transition-all duration-300 ${
            step >= 1 ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          EVENT
        </span>
        <span
          className={`text-accent transition-all duration-300 ${
            step >= 2 ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          +
        </span>
        <span
          className={`transition-all duration-300 ${
            step >= 3 ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          STORY
        </span>
      </span>

      {/* 단계 B: EVENTORY (겹쳐서 크로스페이드) */}
      <span
        className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
          step >= 4 ? "opacity-100" : "opacity-0"
        }`}
      >
        EVENTORY
      </span>
    </Link>
  );
}
