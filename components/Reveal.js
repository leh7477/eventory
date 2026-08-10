"use client";

import { useEffect, useRef } from "react";

// 스크롤로 화면에 들어오면 아래에서 떠오르며 나타나는 래퍼 (아이엠브랜드식 reveal).
// - .reveal 클래스는 JS가 마운트 후 붙임 → no-JS면 숨지 않고 그대로 보임(안전)
// - IntersectionObserver + 스크롤 이벤트 이중 감지
// - 화면 밖으로 완전히 나가면 다시 숨김 → 다시 올렸다 내리면 재등장(반복)
// - delay(ms)로 여러 개를 하나씩 시차 등장
export default function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay) el.style.transitionDelay = `${delay}ms`;
    el.classList.add("reveal"); // 여기서 숨김
    void el.offsetWidth; // 리플로우 강제

    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 상단이 화면 78%까지 올라오면 등장
      // 상단이 화면 60%(중간쯤)까지 올라오면 등장 → 중앙에서 '짜잔'
      const enter = r.top < vh * 0.6 && r.bottom > 0;
      // 화면 밖으로 완전히 벗어나면 숨김 (그 사이 구간은 상태 유지 → 깜빡임 방지)
      const off = r.bottom <= 0 || r.top >= vh;
      if (enter) el.classList.add("is-visible");
      else if (off) el.classList.remove("is-visible");
    };

    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(() => update(), {
        threshold: [0, 0.12],
        rootMargin: "0px 0px -40% 0px",
      });
      io.observe(el);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update(); // 처음에 이미 보이는 요소는 바로 등장

    return () => {
      if (io) io.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
