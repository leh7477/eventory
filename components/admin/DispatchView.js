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

// 제작은 회수가 없는 '납품만' 일정 (memo의 '용도: 제작')
const isDeliveryOnly = (ev) =>
  String(ev?.memo || "")
    .split("\n")
    .some((l) => l.trim() === "용도: 제작");

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

export default function DispatchView({
  schedules = [],
  scheduleItems = [],
  onOpenEvent,
  target = null, // 일정 탭에서 납품/회수 날짜를 눌러 넘어온 경우 { date, evId, type, nonce }
}) {
  const router = useRouter();
  const today = todayKST();
  // 넘어온 목표가 있으면 처음부터 그 달을 보여줌
  const [month, setMonth] = useState((target?.date || today).slice(0, 7));
  const [flashKey, setFlashKey] = useState(target ? `${target.evId}-${target.type}` : null);
  const [pending, startTransition] = useTransition();
  const [editSupId, setEditSupId] = useState(null);
  const [supText, setSupText] = useState("");
  const [editRemarkId, setEditRemarkId] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [scrollTo, setScrollTo] = useState(target?.date || null);
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
      if (ev.kind === "task" || ev.cancelled) continue;
      push(ev, "install", ev.start_date, ev.start_time, ev.install_seq);
      if (!isDeliveryOnly(ev))
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
    setFlashKey(null); // 이전 강조가 남아 있으면 그 줄로 스크롤하므로 해제
    setMonth(today.slice(0, 7));
    setScrollTo(today);
  };
  useEffect(() => {
    if (!scrollTo) return;
    // 일정 탭에서 넘어온 경우엔 그 줄로, '오늘' 버튼은 오늘 날짜 블록 맨 위로
    const row = flashKey ? document.getElementById(`disp-row-${flashKey}`) : null;
    if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    else {
      const el = document.getElementById(`disp-${scrollTo}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const t = setTimeout(() => setScrollTo(null), 100);
    return () => clearTimeout(t);
  }, [scrollTo, days]);

  // 일정 탭에서 이미 상세를 열어둔 채 다른 날짜를 눌러 target이 바뀐 경우도 처리
  useEffect(() => {
    if (!target) return;
    setMonth(target.date.slice(0, 7));
    setScrollTo(target.date);
    setFlashKey(`${target.evId}-${target.type}`);
  }, [target?.nonce]);
  // 강조는 잠깐만 보여주고 해제
  useEffect(() => {
    if (!flashKey) return;
    const t = setTimeout(() => setFlashKey(null), 2500);
    return () => clearTimeout(t);
  }, [flashKey]);

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
        <div ref={rowsRef} className="space-y-8">
          {days.map((day) => {
            const stops = byDay[day];
            const cnt = {};
            for (const s of stops) if (s.time) cnt[s.time] = (cnt[s.time] || 0) + 1;
            const conflicts = new Set(Object.keys(cnt).filter((t) => cnt[t] >= 2));
            const isToday = day === today;
            const wd = dow(day);
            return (
              /* 날짜 하나 = 박스 하나 (헤더 + 그날의 납품/회수 줄들을 구분선으로 묶음) */
              <div
                key={day}
                id={`disp-${day}`}
                className={`scroll-mt-16 rounded-xl border border-l-4 bg-white shadow-sm md:scroll-mt-4 ${
                  isToday
                    ? "border-violet-300 border-l-violet-700 ring-1 ring-violet-200"
                    : "border-ink/20 border-l-ink"
                }`}
              >
                {/* 날짜 헤더 — 스크롤해도 위에 붙어 있어 어느 날짜 소속인지 계속 보임 */}
                <div
                  className={`sticky top-14 z-10 flex items-center gap-2 rounded-t-xl px-4 py-2.5 md:top-0 ${
                    isToday ? "bg-violet-700" : "bg-ink"
                  }`}
                >
                  <span
                    className={`text-base font-extrabold ${
                      wd === 0 ? "text-red-300" : wd === 6 ? "text-sky-300" : "text-white"
                    }`}
                  >
                    {day.slice(5).replace("-", "/")} ({WEEK[wd]})
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      오늘
                    </span>
                  )}
                  <span className="text-xs text-white/60">{stops.length}건</span>
                  {conflicts.size > 0 && (
                    <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      ⚠ 시간 겹침({[...conflicts].join(", ")}) · 조율 필요
                    </span>
                  )}
                </div>

                {/* 스톱 목록 */}
                <ul className="divide-y divide-ink/10">
                  {stops.map((s, i) => {
                    const ev = s.ev;
                    const isInstall = s.type === "install";
                    return (
                      <li
                        key={s.key}
                        id={`disp-row-${s.key}`}
                        className={`p-3 transition-colors last:rounded-b-xl ${
                          flashKey === s.key ? "bg-primary/10" : ""
                        }`}
                      >
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
                              {/* 행사 제목 클릭 → 일정 탭의 해당 카드로 이동 (출력물 발주·랩핑 등 단계 확인) */}
                              {onOpenEvent ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenEvent(ev)}
                                  title="일정 탭에서 이 행사 보기"
                                  className="text-left text-sm font-semibold text-ink transition hover:text-primary hover:underline hover:underline-offset-4"
                                >
                                  {ev.title}
                                </button>
                              ) : (
                                <span className="text-sm font-semibold text-ink">{ev.title}</span>
                              )}
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
