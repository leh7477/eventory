"use client";

import { useMemo, useState } from "react";
import { addDays, MAINT_BUFFER_DAYS } from "@/lib/inventory";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const numOf = (s) => {
  const m = String(s).match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
};

// 일정 id → 색 (연한 파스텔 팔레트)
const PALETTE = [
  "#BFE3F2", "#F7C9D9", "#D9CBF2", "#C9E9C9", "#F2E0B8",
  "#F2C6B8", "#C6E0F2", "#E8C6E8", "#CFE8DA", "#E0D2C0",
];
function colorFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return PALETTE[h % PALETTE.length];
}

export default function EquipmentBoard({ equipment = [], schedules = [], scheduleItems = [] }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const schedById = useMemo(
    () => Object.fromEntries(schedules.map((s) => [s.id, s])),
    [schedules]
  );

  // 종류별 유닛 행 (운영중만, 번호순)
  const cats = useMemo(() => {
    const map = new Map();
    for (const e of equipment) {
      if (!e.active || !e.category) continue;
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category).push(e);
    }
    for (const [, arr] of map) arr.sort((a, b) => numOf(a.name) - numOf(b.name));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [equipment]);

  // 종류별 예약을 유닛 행에 배정 (그리디 구간 분할)
  // 반환: { [category]: Array(rowCount) of [ {id,title,start,end} ... ] }
  const rowsByCat = useMemo(() => {
    const out = {};
    for (const [cat, units] of cats) {
      const rowCount = units.length;
      const rowEndUntil = Array(rowCount).fill(null); // 각 행의 마지막 예약 종료일
      const rowBookings = Array.from({ length: rowCount }, () => []);

      // 이 종류의 예약(일정×수량) 펼치기
      const bookings = [];
      for (const it of scheduleItems) {
        if (it.category !== cat) continue;
        const s = schedById[it.schedule_id];
        if (!s) continue;
        bookings.push({
          id: s.id,
          title: s.title || "행사",
          start: s.start_date,
          end: s.end_date || s.start_date,
          qty: Number(it.quantity) || 0,
        });
      }
      bookings.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

      for (const b of bookings) {
        let placed = 0;
        for (let r = 0; r < rowCount && placed < b.qty; r++) {
          if (rowEndUntil[r] === null || rowEndUntil[r] < b.start) {
            rowBookings[r].push(b);
            rowEndUntil[r] = addDays(b.end, MAINT_BUFFER_DAYS); // 정비일까지 점유
            placed++;
          }
        }
        // placed < qty 면 초과(가용 검증으로 거의 없음) — 표시 생략
      }
      out[cat] = rowBookings;
    }
    return out;
  }, [cats, scheduleItems, schedById]);

  // 이 달의 날짜들
  const days = useMemo(() => {
    const last = new Date(view.y, view.m + 1, 0).getDate();
    const arr = [];
    for (let d = 1; d <= last; d++) {
      const date = new Date(view.y, view.m, d);
      arr.push({ d, dow: date.getDay(), key: ymd(view.y, view.m, d) });
    }
    return arr;
  }, [view]);

  const totalUnits = equipment.filter((e) => e.active).length;

  const move = (delta) => {
    setView((v) => {
      const nm = v.m + delta;
      return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  };

  // 특정 행에서 그 날의 예약 찾기
  const bookingOn = (bookings, key) =>
    bookings.find((b) => b.start <= key && key <= b.end) || null;

  return (
    <div>
      {/* 월 네비 */}
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => move(-1)}
          className="rounded-md border border-ink/15 px-2.5 py-1 text-sm text-ink/70 hover:bg-ink/5"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-ink">
          {view.y}년 {view.m + 1}월
        </span>
        <button
          type="button"
          onClick={() => move(1)}
          className="rounded-md border border-ink/15 px-2.5 py-1 text-sm text-ink/70 hover:bg-ink/5"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setView({ y: now.getFullYear(), m: now.getMonth() })}
          className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/60 hover:bg-ink/5"
        >
          이번 달
        </button>
      </div>

      {totalUnits === 0 ? (
        <p className="rounded-xl border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/40">
          운영중인 기기가 없습니다. 위에서 기기를 먼저 등록하세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[92px] border-b border-r border-ink/10 bg-ink/[0.03] px-2 py-1.5 text-left font-bold text-ink/70">
                  기기 / 날짜
                </th>
                {days.map((dy) => (
                  <th
                    key={dy.key}
                    className={`min-w-[26px] border-b border-ink/10 px-0 py-1 text-center font-medium ${
                      dy.dow === 0 ? "text-red-500" : dy.dow === 6 ? "text-blue-500" : "text-ink/50"
                    }`}
                  >
                    <div>{dy.d}</div>
                    <div className="text-[9px] text-ink/35">{WEEK[dy.dow]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cats.map(([cat, units]) => (
                <FragmentRows
                  key={cat}
                  cat={cat}
                  units={units}
                  rows={rowsByCat[cat]}
                  days={days}
                  bookingOn={bookingOn}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-ink/40">
        색 막대 = 배정된 행사(납품~회수). 빗금 = 정비일(회수 다음날, 재고 불가). 빈 칸 = 가용.
      </p>
    </div>
  );
}

function FragmentRows({ cat, units, rows, days, bookingOn }) {
  return (
    <>
      <tr>
        <td
          colSpan={days.length + 1}
          className="sticky left-0 border-b border-t border-ink/10 bg-ink/[0.04] px-2 py-1 text-[11px] font-bold text-ink/60"
        >
          {cat} · {units.length}대
        </td>
      </tr>
      {units.map((u, r) => (
        <tr key={u.id}>
          <td className="sticky left-0 z-10 border-b border-r border-ink/10 bg-white px-2 py-1 font-medium text-ink/80">
            {u.name}
          </td>
          {days.map((dy, di) => {
            const b = bookingOn(rows[r] || [], dy.key);
            // 라벨은 예약 실제 시작일, 또는 지난달에서 이어져 온 경우 이 달 첫날에도 표시
            const contFromPrev = b && di === 0 && b.start < dy.key;
            const isStart = b && (b.start === dy.key || contFromPrev);
            const contToNext = b && di === days.length - 1 && b.end > dy.key;
            // 정비일 = 어떤 예약의 회수 다음날 (해당 칸에 다른 예약이 없을 때)
            const maint =
              !b && (rows[r] || []).some((x) => addDays(x.end, 1) === dy.key);
            return (
              <td
                key={dy.key}
                title={
                  b
                    ? `${b.title} (${b.start}~${b.end})`
                    : maint
                    ? "정비 (회수 다음날 · 재고 불가)"
                    : ""
                }
                className="relative border-b border-ink/5 p-0"
                style={{
                  background: b
                    ? colorFor(b.id)
                    : maint
                    ? "repeating-linear-gradient(45deg,#E5E7EB,#E5E7EB 3px,#F3F4F6 3px,#F3F4F6 6px)"
                    : undefined,
                }}
              >
                {isStart && (
                  <span className="pointer-events-none absolute left-1 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold text-ink/80">
                    {contFromPrev ? "‹ " : ""}
                    {String(b.title).split(" · ")[0]}
                  </span>
                )}
                {contToNext && (
                  <span className="pointer-events-none absolute right-0.5 top-1/2 z-10 -translate-y-1/2 text-[10px] font-bold text-ink/50">
                    ›
                  </span>
                )}
                <div className="h-6" />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
