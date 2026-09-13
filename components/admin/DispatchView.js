"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import {
  reorderStops,
  setScheduleSupplies,
} from "@/app/admin/(panel)/schedule/actions";

const hm = (t) => (t ? String(t).slice(0, 5) : "");
const pad = (n) => String(n).padStart(2, "0");
function todayKST() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
const shiftDay = (ymd, delta) => {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function DispatchView({ schedules = [], scheduleItems = [] }) {
  const router = useRouter();
  const [day, setDay] = useState(todayKST());
  const [pending, startTransition] = useTransition();
  const [editSupId, setEditSupId] = useState(null);
  const [supText, setSupText] = useState("");

  // 일정별 기기 요약
  const equipBySched = useMemo(() => {
    const m = {};
    for (const it of scheduleItems) {
      if (!it.quantity) continue;
      (m[it.schedule_id] = m[it.schedule_id] || []).push(`${it.category} ${it.quantity}`);
    }
    return m;
  }, [scheduleItems]);

  // 그 날의 배차 스톱 (설치=start_date, 회수=end_date)
  const stops = useMemo(() => {
    const list = [];
    for (const ev of schedules) {
      if (ev.kind === "task") continue;
      if (ev.start_date === day)
        list.push({
          key: `${ev.id}-install`,
          id: ev.id,
          type: "install",
          time: hm(ev.start_time),
          seq: ev.install_seq,
          ev,
        });
      if ((ev.end_date || ev.start_date) === day)
        list.push({
          key: `${ev.id}-pickup`,
          id: ev.id,
          type: "pickup",
          time: hm(ev.end_time),
          seq: ev.pickup_seq,
          ev,
        });
    }
    list.sort(
      (a, b) =>
        (a.seq ?? 9999) - (b.seq ?? 9999) ||
        (a.time || "99:99").localeCompare(b.time || "99:99")
    );
    return list;
  }, [schedules, day]);

  // 시간 겹침(중복) 감지 — 1대라 같은 시간 두 곳 불가
  const conflictTimes = useMemo(() => {
    const cnt = {};
    for (const s of stops) if (s.time) cnt[s.time] = (cnt[s.time] || 0) + 1;
    return new Set(Object.keys(cnt).filter((t) => cnt[t] >= 2));
  }, [stops]);

  const run = (fn) => startTransition(async () => {
    const res = await fn();
    if (res?.error) alert(res.error);
    else router.refresh();
  });

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= stops.length) return;
    const arr = [...stops];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    run(() => reorderStops(arr.map((s) => ({ id: s.id, type: s.type }))));
  };

  const dow = new Date(day + "T00:00:00").getDay();

  return (
    <div className="space-y-3">
      {/* 날짜 네비 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDay((d) => shiftDay(d, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-ink/5"
        >
          ‹
        </button>
        <div className="w-36">
          <DatePicker value={day} onChange={(v) => v && setDay(v)} />
        </div>
        <span
          className={`text-sm font-bold ${
            dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-ink/70"
          }`}
        >
          {WEEK[dow]}요일
        </span>
        <button
          type="button"
          onClick={() => setDay((d) => shiftDay(d, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-ink/5"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setDay(todayKST())}
          className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/60 hover:bg-ink/5"
        >
          오늘
        </button>
        <span className="ml-auto text-xs text-ink/40">총 {stops.length}건</span>
      </div>

      {/* 시간 겹침 경고 */}
      {conflictTimes.size > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          ⚠ 같은 시간({[...conflictTimes].join(", ")})에 배차가 겹칩니다. 차량이 1대라
          동시 진행이 어려우니 <b>시간 조율이 필요</b>합니다.
        </div>
      )}

      {stops.length === 0 ? (
        <p className="rounded-xl border border-ink/10 bg-white px-4 py-10 text-center text-sm text-ink/40">
          이 날 배차(설치/회수)가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {stops.map((s, i) => {
            const ev = s.ev;
            const isInstall = s.type === "install";
            return (
              <li
                key={s.key}
                className="rounded-xl border border-ink/10 bg-white p-3"
              >
                <div className="flex items-start gap-2.5">
                  {/* 순번 + 이동 */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      disabled={pending || i === 0}
                      onClick={() => move(i, -1)}
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
                      onClick={() => move(i, 1)}
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
                        {isInstall ? "설치/납품" : "회수"}
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
                      {s.time && conflictTimes.has(s.time) && (
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
                    {editSupId === s.ev.id ? (
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
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
