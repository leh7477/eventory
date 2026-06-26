"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const BASE =
  "font-logo text-2xl font-extrabold tracking-tight text-ink sm:text-4xl";

export default function LogoAnimated() {
  // step: 0 → 1(EVENT) → 2(+) → 3(STORY) → 4(모핑: +,ST 사라지고 ORY가 EVENT에 붙음)
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  // 검토용: 매 로드마다 재생. (확정 후 true로 바꾸면 세션당 1회)
  const REPLAY_ONCE = false;

  useEffect(() => {
    if (REPLAY_ONCE) {
      let played = false;
      try {
        played = sessionStorage.getItem("logoPlayed") === "1";
      } catch {}
      if (played) {
        setDone(true);
        return;
      }
    }

    const timers = [
      setTimeout(() => setStep(1), 200),
      setTimeout(() => setStep(2), 650),
      setTimeout(() => setStep(3), 1050),
      setTimeout(() => setStep(4), 1800),
      setTimeout(() => {
        setDone(true);
        try {
          sessionStorage.setItem("logoPlayed", "1");
        } catch {}
      }, 2700),
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

  const morph = step >= 4;

  return (
    <Link href="/" aria-label="EVENTORY" className={`${BASE} inline-flex items-baseline`}>
      {/* EVENT — 끝까지 고정 */}
      <span
        className={`transition-opacity duration-300 ${
          step >= 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        EVENT
      </span>

      {/* + — 등장했다가 모핑 때 폭이 줄며 사라짐 */}
      <span
        className={`inline-block overflow-hidden whitespace-nowrap transition-all duration-500 ${
          step >= 2 && !morph ? "mx-2 max-w-[2em] opacity-100" : "mx-0 max-w-0 opacity-0"
        }`}
      >
        +
      </span>

      {/* ST — STORY로 등장했다가 모핑 때 사라짐 */}
      <span
        className={`inline-block overflow-hidden whitespace-nowrap transition-all duration-500 ${
          step >= 3 && !morph ? "max-w-[3em] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        ST
      </span>

      {/* ORY — STORY 일부로 등장, 모핑 후 EVENT에 붙어 EVENTORY 완성 */}
      <span
        className={`inline-block overflow-hidden whitespace-nowrap transition-all duration-500 ${
          step >= 3 ? "max-w-[3em] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        ORY
      </span>
    </Link>
  );
}
