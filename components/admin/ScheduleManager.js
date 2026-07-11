"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSchedule,
  deleteSchedule,
  updateScheduleDatetime,
} from "@/app/admin/(panel)/schedule/actions";
import TimeSelect from "@/components/admin/TimeSelect";

// "10:00:00" → "10:00"
const hm = (t) => (t ? String(t).slice(0, 5) : "");

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n) => String(n).padStart(2, "0");
const dstr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayStr() {
  const t = new Date();
  return dstr(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function ScheduleManager({ schedules }) {
  const router = useRouter();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [form, setForm] = useState({
    title: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    location: "",
    memo: "",
  });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false); // 직접 추가 폼 접힘(기본)

  // 일정별 설치/회수 일시 인라인 편집
  const [timeEditId, setTimeEditId] = useState(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");

  const openTimeEdit = (ev) => {
    setTimeEditId(ev.id);
    setEditStartDate(ev.start_date ?? "");
    setEditEndDate(ev.end_date ?? ev.start_date ?? "");
    setTimeStart(hm(ev.start_time));
    setTimeEnd(hm(ev.end_time));
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = (fn) =>
    startTransition(async () => {
      setError("");
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });

  const onAdd = (e) => {
    e.preventDefault();
    run(async () => {
      const res = await createSchedule(form);
      if (!res?.error)
        setForm({
          title: "",
          start_date: "",
          end_date: "",
          start_time: "",
          end_time: "",
          location: "",
          memo: "",
        });
      return res;
    });
  };

  const { y, m } = view;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();

  // 주 단위(7칸씩)로 나눔
  const weeks = [];
  {
    let cur = [];
    for (let i = 0; i < firstDay; i++) cur.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cur.push(d);
      if (cur.length === 7) {
        weeks.push(cur);
        cur = [];
      }
    }
    if (cur.length) {
      while (cur.length < 7) cur.push(null);
      weeks.push(cur);
    }
  }

  // 한 주 안에서 각 일정이 차지하는 구간(막대) 계산 + 겹치면 줄(lane) 배정
  const weekSegments = (week) => {
    const segs = [];
    schedules.forEach((ev) => {
      const end = ev.end_date || ev.start_date;
      let startCol = -1;
      let endCol = -1;
      week.forEach((d, col) => {
        if (d === null) return;
        const ds = dstr(y, m, d);
        if (ev.start_date <= ds && ds <= end) {
          if (startCol === -1) startCol = col;
          endCol = col;
        }
      });
      if (startCol !== -1) {
        segs.push({
          ev,
          startCol,
          endCol,
          startsHere: dstr(y, m, week[startCol]) === ev.start_date,
          endsHere: dstr(y, m, week[endCol]) === end,
        });
      }
    });
    segs.sort(
      (a, b) =>
        a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol)
    );
    const laneEnds = [];
    segs.forEach((s) => {
      let lane = 0;
      while (laneEnds[lane] !== undefined && laneEnds[lane] >= s.startCol) lane++;
      laneEnds[lane] = s.endCol;
      s.lane = lane;
    });
    return segs;
  };

  const prev = () => setView(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const next = () => setView(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  // 이번 달에 걸치는 일정 (목록용)
  const monthStart = dstr(y, m, 1);
  const monthEnd = dstr(y, m, daysInMonth);
  const monthEvents = schedules
    .filter((ev) => ev.start_date <= monthEnd && (ev.end_date || ev.start_date) >= monthStart)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

  const inputCls =
    "w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-6">
      {/* 달력 */}
      <div className="rounded-xl border border-ink/10 bg-white p-4">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-ink/5"
            aria-label="이전 달"
          >
            ‹
          </button>
          <p className="text-base font-bold text-ink">
            {y}년 {m + 1}월
          </p>
          <button
            type="button"
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-ink/5"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-xs font-medium">
          {WEEK.map((w, i) => (
            <div
              key={w}
              className={`py-1.5 ${i === 0 ? "text-primary" : i === 6 ? "text-blue-500" : "text-ink/50"}`}
            >
              {w}
            </div>
          ))}
        </div>

        <div>
          {weeks.map((week, wi) => {
            const segs = weekSegments(week);
            return (
              <div key={wi} className="relative min-h-20">
                {/* 배경: 칸 테두리 + 오늘 표시 */}
                <div className="absolute inset-0 grid grid-cols-7">
                  {week.map((d, col) => {
                    const ds = d ? dstr(y, m, d) : null;
                    const isToday = ds === today;
                    return (
                      <div
                        key={col}
                        className={`border border-ink/5 ${isToday ? "bg-primary/5" : ""} ${
                          d === null ? "border-transparent" : ""
                        }`}
                      />
                    );
                  })}
                </div>

                {/* 내용: 날짜 숫자(1행) + 이어진 일정 막대(2행~) */}
                <div className="relative grid grid-cols-7 pb-1.5">
                  {week.map((d, col) => {
                    if (d === null)
                      return (
                        <div key={col} className="h-7" style={{ gridColumn: col + 1, gridRow: 1 }} />
                      );
                    const ds = dstr(y, m, d);
                    const isToday = ds === today;
                    return (
                      <div key={col} className="h-7 p-1" style={{ gridColumn: col + 1, gridRow: 1 }}>
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                            isToday
                              ? "bg-primary font-bold text-white"
                              : col === 0
                              ? "text-primary"
                              : col === 6
                              ? "text-blue-500"
                              : "text-ink/70"
                          }`}
                        >
                          {d}
                        </span>
                      </div>
                    );
                  })}
                  {segs.map((s, si) => {
                    const timeRange =
                      s.ev.start_time || s.ev.end_time
                        ? `${hm(s.ev.start_time) || "?"} ~ ${hm(s.ev.end_time) || "?"}`
                        : "";
                    return (
                      <div
                        key={si}
                        title={`${s.ev.title}${timeRange ? ` (${timeRange})` : ""}`}
                        style={{
                          gridColumn: `${s.startCol + 1} / ${s.endCol + 2}`,
                          gridRow: s.lane + 2,
                        }}
                        className={`z-10 mb-0.5 truncate bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-blue-800 ${
                          s.startsHere ? "ml-0.5 rounded-l" : ""
                        } ${s.endsHere ? "mr-0.5 rounded-r" : ""}`}
                      >
                        {s.ev.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 이번 달 일정 목록 */}
      <div className="rounded-xl border border-ink/10 bg-white">
        <p className="border-b border-ink/10 px-4 py-2.5 text-sm font-bold text-ink">
          {m + 1}월 일정 ({monthEvents.length})
        </p>
        {monthEvents.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink/40">
            이번 달 일정이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {monthEvents.map((ev) => {
              const past = (ev.end_date || ev.start_date) < today;
              const timeLabel =
                ev.start_time || ev.end_time
                  ? [
                      ev.start_time ? `설치 ${hm(ev.start_time)}` : null,
                      ev.end_time ? `회수 ${hm(ev.end_time)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : null;
              return (
                <li key={ev.id}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                    <span
                      className={`w-full shrink-0 text-xs sm:w-44 ${past ? "text-ink/35" : "text-ink/60"}`}
                    >
                      {ev.start_date}
                      {ev.end_date && ev.end_date !== ev.start_date
                        ? ` ~ ${ev.end_date}`
                        : ""}
                      {timeLabel && (
                        <span className="mt-0.5 block font-medium text-blue-700">
                          🕐 {timeLabel}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${past ? "text-ink/40" : "text-ink"}`}>
                        {ev.title}
                        {ev.inquiry_id && (
                          <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 align-middle">
                            연동
                          </span>
                        )}
                      </p>
                      {(ev.location || ev.memo) && (
                        <p className={`truncate text-xs ${past ? "text-ink/30" : "text-ink/50"}`}>
                          {[ev.location, ev.memo?.split("\n")[0]].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        timeEditId === ev.id ? setTimeEditId(null) : openTimeEdit(ev)
                      }
                      className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${
                        timeEditId === ev.id
                          ? "border-ink bg-ink text-white"
                          : "border-ink/15 text-ink/70 hover:bg-ink/5"
                      }`}
                    >
                      일시
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`'${ev.title}' 일정을 삭제할까요?`))
                          run(() => deleteSchedule(ev.id));
                      }}
                      className="shrink-0 rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 설치/회수 일시 인라인 편집 */}
                  {timeEditId === ev.id && (
                    <div className="space-y-2.5 border-t border-ink/5 bg-ink/[0.015] px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-10 shrink-0 text-xs font-bold text-blue-700">설치</span>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                          className="rounded-md border border-ink/15 px-2 py-1.5 text-sm outline-none focus:border-primary"
                        />
                        <TimeSelect value={timeStart} onChange={setTimeStart} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-10 shrink-0 text-xs font-bold text-amber-700">회수</span>
                        <input
                          type="date"
                          value={editEndDate}
                          min={editStartDate || undefined}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="rounded-md border border-ink/15 px-2 py-1.5 text-sm outline-none focus:border-primary"
                        />
                        <TimeSelect value={timeEnd} onChange={setTimeEnd} />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              const res = await updateScheduleDatetime(ev.id, {
                                start_date: editStartDate,
                                end_date: editEndDate,
                                start_time: timeStart,
                                end_time: timeEnd,
                              });
                              if (res?.error) alert(res.error);
                              else setTimeEditId(null);
                              return res;
                            })
                          }
                          className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeEditId(null)}
                          className="rounded-md border border-ink/15 px-3 py-1.5 text-xs text-ink/60 hover:bg-ink/5"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 수동 일정 추가 (기본 접힘) */}
      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-full rounded-xl border border-dashed border-ink/20 py-3 text-sm font-medium text-ink/60 transition hover:border-ink/40 hover:bg-ink/[0.02]"
        >
          + 일정 직접 추가
        </button>
      )}
      {showAdd && (
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">일정 직접 추가</p>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/50 hover:bg-ink/5"
          >
            접기
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink/60">제목</label>
            <input
              value={form.title}
              onChange={set("title")}
              placeholder="예: ○○업체 · 가챠머신"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">설치 날짜</label>
            <input type="date" value={form.start_date} onChange={set("start_date")} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">회수 날짜 (비우면 당일)</label>
            <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={set("end_date")} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">설치 시간 (선택)</label>
            <TimeSelect
              value={form.start_time}
              onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">회수 시간 (선택)</label>
            <TimeSelect
              value={form.end_time}
              onChange={(v) => setForm((f) => ({ ...f, end_time: v }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink/60">장소 (선택)</label>
            <input value={form.location} onChange={set("location")} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink/60">메모 (선택)</label>
            <input value={form.memo} onChange={set("memo")} className={inputCls} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
        >
          {pending ? "처리 중..." : "일정 추가"}
        </button>
      </form>
      )}
    </div>
  );
}
