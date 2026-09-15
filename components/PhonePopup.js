"use client";

import { useEffect, useState } from "react";

// PC(마우스)에서 tel: 링크 클릭 시 전화가 안 걸리므로, 번호를 팝업으로 보여주고 복사 제공.
// 모바일(터치)에선 개입하지 않고 그대로 전화 걸기.
const fmtPhone = (s) => {
  const d = String(s || "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (d.length === 10)
    return d.startsWith("02")
      ? d.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3")
      : d.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  return String(s || "");
};

export default function PhonePopup() {
  const [num, setNum] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const isTouch =
      window.matchMedia?.("(pointer: coarse)")?.matches ||
      "ontouchstart" in window;
    if (isTouch) return; // 모바일: 그대로 전화 걸기

    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="tel:"]');
      if (!a) return;
      e.preventDefault();
      const raw = decodeURIComponent(
        (a.getAttribute("href") || "").replace(/^tel:/i, "")
      );
      setCopied(false);
      setNum(raw);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!num) return null;
  const display = fmtPhone(num);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 미지원 — 무시
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => setNum(null)}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl">
        <p className="text-sm font-bold text-ink/50">전화 문의</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
          {display}
        </p>
        <p className="mt-1 text-xs text-ink/45">전화 또는 문자로 연락 주세요.</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex-1 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black"
          >
            {copied ? "복사됨 ✓" : "번호 복사"}
          </button>
          <button
            type="button"
            onClick={() => setNum(null)}
            className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/60 hover:bg-ink/5"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
