"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reorderStops,
  setScheduleSupplies,
  setScheduleRemark,
} from "@/app/admin/(panel)/schedule/actions";

const hm = (t) => (t ? String(t).slice(0, 5) : "");
const pad = (n) => String(n).padStart(2, "0");
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function todayKST() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export default function DispatchView({ schedules = [], scheduleItems = [] }) {
  const router = useRouter();
  const today = todayKST();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [pending, startTransition] = useTransition();
  const [editSupId, setEditSupId] = useState(null);
  const [supText, setSupText] = useState("");
  const [editRemarkId, setEditRemarkId] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [scrollTo, setScrollTo] = useState(null);
  const rowsRef = useRef(null);

  // 일정별 기기 요약
  const equipBySched = useMemo(() => {
    const m = {};
    for (const it of scheduleItems) {
      if (!it.quantity) continue;
      (m[it.schedule_id] = m[it.schedule_id] || []).push(`${it.category} ${it.quantity}`);
    }
    return m;
  }, [scheduleItems]);

  // 이 달의 날짜별 납품/회수 스톱
  const { days, byDay } = useMemo(() => {
    const map = {};
    const push = (ev, type, date, time, seq) => {
      if (!date || date.slice(0, 7) !== month) return;
      (map[date] = map[date] || []).push({
        key: `${ev.id}-${type}`,
        id: ev.id,
        type,
        time: hm(time),
        seq,
        ev,
      });
    };
    for (const ev of schedules) {
      if (ev.kind === "task") continue;
      push(ev, "install", ev.start_date, ev.start_time, ev.install_seq);
      push(ev, "pickup", ev.end_date || ev.start_date, ev.end_time, ev.pickup_seq);
    }
    const dayKeys = Object.keys(map).sort();
    for (const d of dayKeys)
      map[d].sort(
        (a, b) =>
          (a.seq ?? 9999) - (b.seq ?? 9999) ||
          (a.time || "99:99").localeCompare(b.time || "99:99")
      );
    return { days: dayKeys, byDay: map };
  }, [schedules, month]);

  // '오늘' → 이번 달로 이동 후 오늘 섹션으로 스크롤
  const goToday = () => {
    setMonth(today.slice(0, 7));
    setScrollTo(today);
  };
  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(`disp-${scrollTo}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = setTimeout(() => setScrollTo(null), 100);
    return () => clearTimeout(t);
  }, [scrollTo, days]);

  const run = (fn) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.error) alert(res.error);
      else router.refresh();
    });

  const move = (day, idx, dir) => {
    const arr = [...byDay[day]];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    run(() => reorderStops(arr.map((s) => ({ id: s.id, type: s.type }))));
  };

  const totalStops = days.reduce((n, d) => n + byDay[d].length, 0);

  const dow = (d) => new Date(d + "T00:00:00").getDay();

  return (
    <div className="space-y-3">
      {/* 월 네비 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-ink/5"
        >
          ‹
        </button>
        <span className="text-base font-bold text-ink">{month.replace("-", ". ")}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-ink/5"
        >
          ›
        </button>
        <button
          type="button"
          onClick={goToday}
          className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/60 hover:bg-ink/5"
        >
          오늘
        </button>
        <span className="ml-auto text-xs text-ink/40">총 {totalStops}건</span>
      </div>

      {days.length === 0 ? (
        <p className="rounded-xl border border-ink/10 bg-white px-4 py-10 text-center text-sm text-ink/40">
          이 달 배차(납품/회수)가 없습니다.
        </p>
      ) : (
        <div ref={rowsRef} className="space-y-4">
          {days.map((day) => {
            const stops = byDay[day];
            const cnt = {};
            for (const s of stops) if (s.time) cnt[s.time] = (cnt[s.time] || 0) + 1;
            const conflicts = new Set(Object.keys(cnt).filter((t) => cnt[t] >= 2));
            const isToday = day === today;
            const wd = dow(day);
            return (
              <div
                key={day}
                id={`disp-${day}`}
                className={`scroll-mt-4 ${
                  isToday ? "rounded-xl bg-primary/5 p-2 ring-1 ring-primary/20" : ""
                }`}
              >
                {/* 날짜 헤더 */}
                <div
                  className={`mb-1.5 flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                    isToday ? "bg-primary/10" : "bg-ink/[0.04]"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      wd === 0 ? "text-red-500" : wd === 6 ? "text-blue-500" : "text-ink"
                    }`}
                  >
                    {day.slice(5).replace("-", "/")} ({WEEK[wd]})
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                      오늘
                    </span>
                  )}
                  <span className="text-xs text-ink/40">{stops.length}건</span>
                  {conflicts.size > 0 && (
                    <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      ⚠ 시간 겹침({[...conflicts].join(", ")}) · 조율 필요
                    </span>
                  )}
                </div>

                {/* 스톱 목록 */}
                <ul className="space-y-2">
                  {stops.map((s, i) => {
                    const ev = s.ev;
                    const isInstall = s.type === "install";
                    return (
                      <li key={s.key} className="rounded-xl border border-ink/10 bg-white p-3">
                        <div className="flex items-start gap-2.5">
                          {/* 순번 + 이동 */}
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              type="button"
                              disabled={pending || i === 0}
                              onClick={() => move(day, i, -1)}
                              className="text-ink/40 hover:text-ink disabled:opacity-25"
                              aria-label="위로"
                            >
                              ▲
                            </button>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                              {i + 1}
                            </span>
                            <button
                              type="button"
                              disabled={pending || i === stops.length - 1}
                              onClick={() => move(day, i, 1)}
                              className="text-ink/40 hover:text-ink disabled:opacity-25"
                              aria-label="아래로"
                            >
                              ▼
                            </button>
                          </div>

                          {/* 내용 */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isInstall
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {isInstall ? "납품" : "회수"}
                              </span>
                              {s.time && (
                                <span
                                  className={`text-xs font-bold ${
                                    isInstall ? "text-blue-700" : "text-amber-700"
                                  }`}
                                >
                                  {s.time}
                                </span>
                              )}
                              {s.time && conflicts.has(s.time) && (
                                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                                  시간 겹침
                                </span>
                              )}
                              <span className="text-sm font-semibold text-ink">{ev.title}</span>
                              {equipBySched[ev.id] && (
                                <span className="rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium text-ink/60">
                                  {equipBySched[ev.id].join(" · ")}
                                </span>
                              )}
                            </div>

                            {ev.location && (
                              <p className="mt-1 flex items-start gap-1 break-words text-xs text-ink/60">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-[1px] shrink-0 text-ink/40">
                                  <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
                                  <circle cx="12" cy="10" r="2.5" />
                                </svg>
                                <span className="min-w-0">{ev.location}</span>
                              </p>
                            )}
                            {(ev.client_manager || ev.client_phone) && (
                              <p className="text-xs text-ink/45">
                                {ev.client_manager}
                                {ev.client_phone ? ` (${ev.client_phone})` : ""}
                              </p>
                            )}

                            {/* 물품 */}
                            {editSupId === ev.id ? (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <input
                                  value={supText}
                                  onChange={(e) => setSupText(e.target.value)}
                                  placeholder="예: 캡슐, 전원선, 리모컨, 바구니"
                                  className="flex-1 rounded-md border border-ink/15 px-2 py-1 text-xs outline-none focus:border-primary"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() =>
                                    run(async () => {
                                      const r = await setScheduleSupplies(ev.id, supText);
                                      if (!r?.error) setEditSupId(null);
                                      return r;
                                    })
                                  }
                                  className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold text-white"
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditSupId(null)}
                                  className="rounded-md border border-ink/15 px-2 py-1 text-xs text-ink/50"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditSupId(ev.id);
                                  setSupText(ev.supplies || "");
                                }}
                                className="mt-1.5 block w-full rounded-md bg-emerald-50 px-2 py-1 text-left text-xs text-ink/70 hover:bg-emerald-100"
                              >
                                <span className="font-bold text-emerald-700">물품</span>{" "}
                                {ev.supplies || <span className="text-ink/35">(클릭해 입력)</span>}
                              </button>
                            )}

                            {/* 비고 */}
                            {editRemarkId === ev.id ? (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <input
                                  value={remarkText}
                                  onChange={(e) => setRemarkText(e.target.value)}
                                  placeholder="예: 일찍 도착해도 됨 / 주차 지하 B2"
                                  className="flex-1 rounded-md border border-ink/15 px-2 py-1 text-xs outline-none focus:border-primary"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() =>
                                    run(async () => {
                                      const r = await setScheduleRemark(ev.id, remarkText);
                                      if (!r?.error) setEditRemarkId(null);
                                      return r;
                                    })
                                  }
                                  className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold text-white"
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditRemarkId(null)}
                                  className="rounded-md border border-ink/15 px-2 py-1 text-xs text-ink/50"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditRemarkId(ev.id);
                                  setRemarkText(ev.remark || "");
                                }}
                                className="mt-1.5 block w-full rounded-md bg-amber-50 px-2 py-1 text-left text-xs text-ink/70 hover:bg-amber-100"
                              >
                                <span className="font-bold text-amber-700">비고</span>{" "}
                                {ev.remark || <span className="text-ink/35">(클릭해 입력)</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
