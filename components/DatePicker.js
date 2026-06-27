"use client";

import { useState, useRef, useEffect } from "react";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function toDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmt(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// value/min/onChange 는 모두 "YYYY-MM-DD" 문자열 기준
export default function DatePicker({ value, onChange, min, placeholder = "년 / 월 / 일", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const base = value ? toDate(value) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  useEffect(() => {
    if (!open) return;
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // 열 때 선택값 기준으로 뷰 이동
  const openCal = () => {
    const b = value ? toDate(value) : new Date();
    setView({ y: b.getFullYear(), m: b.getMonth() });
    setOpen(true);
  };

  const { y, m } = view;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const minDate = min ? toDate(min) : null;
  const sel = value ? toDate(value) : null;
  const todayD = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateOnly = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const isDisabled = (d) => minDate && new Date(y, m, d) < dateOnly(minDate);
  const isSel = (d) => sel && sel.getFullYear() === y && sel.getMonth() === m && sel.getDate() === d;
  const isToday = (d) =>
    todayD.getFullYear() === y && todayD.getMonth() === m && todayD.getDate() === d;

  const prev = () => setView(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const next = () => setView(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));
  const pick = (d) => {
    if (isDisabled(d)) return;
    onChange(fmt(y, m, d));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={openCal}
        className={`flex w-full items-center justify-between rounded-md border border-ink/15 px-3 py-2.5 text-left text-sm outline-none transition focus:border-primary ${className}`}
      >
        <span className={value ? "text-ink" : "text-ink/40"}>
          {value ? value.replaceAll("-", ". ") : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-ink/10 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between px-1">
            <button type="button" onClick={prev} aria-label="이전 달" className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition hover:bg-ink/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <span className="text-sm font-bold text-ink">
              {y}년 {m + 1}월
            </span>
            <button type="button" onClick={next} aria-label="다음 달" className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition hover:bg-ink/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-xs">
            {WEEK.map((w, i) => (
              <div key={w} className={`py-1 font-medium ${i === 0 ? "text-primary" : i === 6 ? "text-blue-500" : "text-ink/50"}`}>
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 text-center text-sm">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const dis = isDisabled(d);
              const selected = isSel(d);
              const col = i % 7;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => pick(d)}
                  className={`mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-full transition ${
                    selected
                      ? "bg-primary font-bold text-white"
                      : dis
                      ? "cursor-not-allowed text-ink/20"
                      : `hover:bg-primary/10 ${col === 0 ? "text-primary" : col === 6 ? "text-blue-500" : "text-ink"} ${isToday(d) ? "font-bold ring-1 ring-primary/40" : ""}`
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end border-t border-ink/5 pt-2">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                if (!(minDate && dateOnly(t) < dateOnly(minDate))) {
                  onChange(fmt(t.getFullYear(), t.getMonth(), t.getDate()));
                  setOpen(false);
                }
              }}
              className="rounded-md px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5"
            >
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
