"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSchedule,
  deleteSchedule,
  updateScheduleDatetime,
} from "@/app/admin/(panel)/schedule/actions";
import TimeSelect from "@/components/admin/TimeSelect";
import DatePicker from "@/components/DatePicker";

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
    event_start: "",
    event_end: "",
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

  // 일정별 행사 기간 + 설치/회수 일시 인라인 편집
  const [timeEditId, setTimeEditId] = useState(null);
  const [editEventStart, setEditEventStart] = useState("");
  const [editEventEnd, setEditEventEnd] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");

  const openTimeEdit = (ev) => {
    setTimeEditId(ev.id);
    setEditEventStart(ev.event_start ?? "");
    setEditEventEnd(ev.event_end ?? ev.event_start ?? "");
    setEditStartDate(ev.start_date ?? "");
    setEditEndDate(ev.end_date ?? ev.start_date ?? "");
    setTimeStart(hm(ev.start_time));
    setTimeEnd(hm(ev.end_time));
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setD = (k) => (v) => setForm((f) => ({ ...f, [k]: v })); // DatePicker용(값 직접)

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
          event_start: "",
          event_end: "",
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

  // 날짜 셀 (앞쪽 빈칸 + 1~말일)
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // 그날의 설치/회수 액션 + 장비 배치(설치~회수) 기간 여부
  const dayInfo = (ds) => ({
    installs: schedules.filter((ev) => ev.start_date === ds),
    pickups: schedules.filter((ev) => (ev.end_date || ev.start_date) === ds),
    deployed: schedules.some(
      (ev) => ev.start_date <= ds && ds <= (ev.end_date || ev.start_date)
    ),
  });

  // 오늘/내일 요약용 (설치/회수 발생 목록)
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  const tomorrow = dstr(tmr.getFullYear(), tmr.getMonth(), tmr.getDate());
  const occFor = (ds) => {
    const list = [];
    schedules.forEach((ev) => {
      if (ev.start_date === ds)
        list.push({ type: "설치", ev, time: hm(ev.start_time) });
      if ((ev.end_date || ev.start_date) === ds)
        list.push({ type: "회수", ev, time: hm(ev.end_time) });
    });
    return list.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
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

  const OccCard = ({ title, ds }) => {
    const list = occFor(ds);
    return (
      <div className="rounded-xl border border-ink/10 bg-white">
        <p className="border-b border-ink/10 px-4 py-2.5 text-sm font-bold text-ink">
          {title}
          <span className="ml-1.5 text-ink/40">({list.length})</span>
        </p>
        {list.length === 0 ? (
          <p className="px-4 py-5 text-center text-xs text-ink/35">
            설치/회수 일정이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {list.map((o, i) => (
              <li key={i} className="flex items-center gap-2 px-4 py-2.5">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    o.type === "설치"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {o.type}
                </span>
                {o.time && (
                  <span
                    className={`shrink-0 text-xs font-bold ${
                      o.type === "설치" ? "text-blue-700" : "text-amber-700"
                    }`}
                  >
                    {o.time}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {o.ev.title}
                </span>
                {o.ev.location && (
                  <span className="hidden shrink-0 truncate text-xs text-ink/40 sm:block sm:max-w-[40%]">
                    {o.ev.location}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 오늘 / 내일 요약 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <OccCard title="오늘 일정" ds={today} />
        <OccCard title="내일 일정" ds={tomorrow} />
      </div>

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

        {/* 액션 중심: 각 날짜에 그날의 설치/회수만 표시 */}
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (d === null)
              return <div key={i} className="min-h-24 border border-transparent" />;
            const ds = dstr(y, m, d);
            const isToday = ds === today;
            const past = ds < today;
            const col = i % 7;
            const { installs, pickups, deployed } = dayInfo(ds);

            const chip = (kind, ev) => {
              const t = kind === "install" ? hm(ev.start_time) : hm(ev.end_time);
              const cls = past
                ? "bg-ink/[0.05] text-ink/40"
                : kind === "install"
                ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-800";
              return (
                <div
                  key={`${kind}-${ev.id}`}
                  title={`${kind === "install" ? "설치" : "회수"} · ${ev.title}${t ? ` ${t}` : ""}`}
                  className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] leading-tight ${cls}`}
                >
                  <span className="shrink-0 font-bold">
                    {kind === "install" ? "▶설치" : "◀회수"}
                  </span>
                  {t && <span className="shrink-0 font-semibold">{t}</span>}
                  <span className="truncate">{ev.title}</span>
                </div>
              );
            };

            return (
              <div
                key={i}
                className={`min-h-24 border border-ink/5 p-1 ${
                  isToday ? "bg-primary/5" : deployed ? "bg-ink/[0.02]" : ""
                }`}
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
                <div className="mt-1 space-y-0.5">
                  {installs.map((ev) => chip("install", ev))}
                  {pickups.map((ev) => chip("pickup", ev))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink/5 pt-3 text-[11px] text-ink/50">
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-blue-100 px-1 py-0.5 font-bold text-blue-800">▶설치</span>{" "}
            설치 나가는 날
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-amber-100 px-1 py-0.5 font-bold text-amber-800">◀회수</span>{" "}
            회수 나가는 날
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm bg-ink/[0.04]" /> 장비 나가있는 기간
          </span>
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
                <li key={ev.id}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                    <span
                      className={`w-full shrink-0 text-xs sm:w-52 ${past ? "text-ink/35" : "text-ink/70"}`}
                    >
                      {ev.event_start && (
                        <span className="block">
                          <b className={past ? "text-ink/35" : "text-ink/80"}>행사</b>{" "}
                          {ev.event_start}
                          {ev.event_end && ev.event_end !== ev.event_start
                            ? ` ~ ${ev.event_end}`
                            : ""}
                        </span>
                      )}
                      <span className="mt-0.5 block">
                        <b className={past ? "text-ink/35" : "text-blue-700"}>설치</b>{" "}
                        {ev.start_date}
                        {ev.start_time ? ` ${hm(ev.start_time)}` : ""}
                      </span>
                      <span className="mt-0.5 block">
                        <b className={past ? "text-ink/35" : "text-amber-700"}>회수</b>{" "}
                        {ev.end_date || ev.start_date}
                        {ev.end_time ? ` ${hm(ev.end_time)}` : ""}
                      </span>
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
                        <span className="w-10 shrink-0 text-xs font-bold text-ink/70">행사</span>
                        <div className="w-36">
                          <DatePicker value={editEventStart} onChange={setEditEventStart} />
                        </div>
                        <span className="text-ink/40">~</span>
                        <div className="w-36">
                          <DatePicker
                            value={editEventEnd}
                            min={editEventStart || undefined}
                            onChange={setEditEventEnd}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-10 shrink-0 text-xs font-bold text-blue-700">설치</span>
                        <div className="w-36">
                          <DatePicker value={editStartDate} onChange={setEditStartDate} />
                        </div>
                        <TimeSelect value={timeStart} onChange={setTimeStart} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-10 shrink-0 text-xs font-bold text-amber-700">회수</span>
                        <div className="w-36">
                          <DatePicker
                            value={editEndDate}
                            min={editStartDate || undefined}
                            onChange={setEditEndDate}
                          />
                        </div>
                        <TimeSelect value={timeEnd} onChange={setTimeEnd} />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              const res = await updateScheduleDatetime(ev.id, {
                                event_start: editEventStart,
                                event_end: editEventEnd,
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
            <label className="mb-1.5 block text-xs font-medium text-ink/60">행사 시작일 (선택)</label>
            <DatePicker value={form.event_start} onChange={setD("event_start")} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">행사 종료일 (선택)</label>
            <DatePicker value={form.event_end} min={form.event_start || undefined} onChange={setD("event_end")} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">설치 날짜</label>
            <DatePicker value={form.start_date} onChange={setD("start_date")} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">회수 날짜 (비우면 당일)</label>
            <DatePicker value={form.end_date} min={form.start_date || undefined} onChange={setD("end_date")} />
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
