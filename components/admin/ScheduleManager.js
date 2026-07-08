"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSchedule,
  deleteSchedule,
} from "@/app/admin/(panel)/schedule/actions";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n) => String(n).padStart(2, "0");
const dstr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayStr() {
  const t = new Date();
  return dstr(t.getFullYear(), t.getMonth(), t.getDate());
}

// 일정이 해당 날짜에 걸치는지
function covers(ev, dateStr) {
  const end = ev.end_date || ev.start_date;
  return ev.start_date <= dateStr && dateStr <= end;
}

export default function ScheduleManager({ schedules }) {
  const router = useRouter();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [form, setForm] = useState({
    title: "",
    start_date: "",
    end_date: "",
    location: "",
    memo: "",
  });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
        setForm({ title: "", start_date: "", end_date: "", location: "", memo: "" });
      return res;
    });
  };

  const { y, m } = view;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = todayStr();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

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

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="min-h-20 border border-transparent" />;
            const ds = dstr(y, m, d);
            const evs = schedules.filter((ev) => covers(ev, ds));
            const isToday = ds === today;
            const col = i % 7;
            return (
              <div
                key={i}
                className={`min-h-20 border border-ink/5 p-1 ${isToday ? "bg-primary/5" : ""}`}
              >
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
                <div className="mt-0.5 space-y-0.5">
                  {evs.slice(0, 3).map((ev) => (
                    <p
                      key={ev.id}
                      title={ev.title}
                      className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium leading-tight text-primary"
                    >
                      {ev.title}
                    </p>
                  ))}
                  {evs.length > 3 && (
                    <p className="px-1 text-[10px] text-ink/40">+{evs.length - 3}</p>
                  )}
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
              return (
                <li key={ev.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`w-44 shrink-0 text-xs ${past ? "text-ink/35" : "text-ink/60"}`}
                  >
                    {ev.start_date}
                    {ev.end_date && ev.end_date !== ev.start_date
                      ? ` ~ ${ev.end_date}`
                      : ""}
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
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`'${ev.title}' 일정을 삭제할까요?`))
                        run(() => deleteSchedule(ev.id));
                    }}
                    className="shrink-0 rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 수동 일정 추가 */}
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-5">
        <p className="text-sm font-bold text-ink">일정 직접 추가</p>
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
            <label className="mb-1.5 block text-xs font-medium text-ink/60">시작일</label>
            <input type="date" value={form.start_date} onChange={set("start_date")} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">종료일 (비우면 당일)</label>
            <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={set("end_date")} className={inputCls} />
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
    </div>
  );
}
