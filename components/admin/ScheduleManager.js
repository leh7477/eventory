"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createSchedule,
  createTask,
  updateTask,
  deleteSchedule,
  updateScheduleDatetime,
  setScheduleStage,
  createVendor,
  setScheduleVendor,
} from "@/app/admin/(panel)/schedule/actions";

// 행사 일정 진행 단계
const STAGES = ["출력물 발주", "랩핑", "출고", "회수"];
import TimeSelect from "@/components/admin/TimeSelect";
import DatePicker from "@/components/DatePicker";
import ScheduleEquipment from "@/components/admin/ScheduleEquipment";
import ScheduleInfo from "@/components/admin/ScheduleInfo";
import DispatchView from "@/components/admin/DispatchView";

// "10:00:00" → "10:00"
const hm = (t) => (t ? String(t).slice(0, 5) : "");

// 메모에서 "용도: 임대/제작" 추출
const usageOf = (ev) => {
  const line = (ev.memo || "")
    .split("\n")
    .find((l) => l.trim().startsWith("용도:"));
  return line ? line.replace("용도:", "").trim() : null;
};

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n) => String(n).padStart(2, "0");
const dstr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// ISO → "MM/DD HH:mm" (브라우저=KST)
const fmtStamp = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function todayStr() {
  const t = new Date();
  return dstr(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function ScheduleManager({
  schedules,
  equipmentTotals = {},
  equipmentCategories = [],
  scheduleItems = [],
  vendors = [],
}) {
  const router = useRouter();
  const now = new Date();

  // 일정 id → 기간 매핑 (가용 계산용)
  const schedById = Object.fromEntries(
    schedules.map((s) => [s.id, { start_date: s.start_date, end_date: s.end_date }])
  );
  const itemsBySchedule = (id) => scheduleItems.filter((it) => it.schedule_id === id);
  const [equipEditId, setEquipEditId] = useState(null);
  const [infoEditId, setInfoEditId] = useState(null);
  const [mode, setMode] = useState("list"); // 'list' | 'dispatch'

  // 행사 외(업무) 일정 — 추가/편집
  const emptyTask = { date: "", start_time: "", end_time: "", title: "", memo: "" };
  const [showTaskAdd, setShowTaskAdd] = useState(false);
  const [newTask, setNewTask] = useState(emptyTask);
  const [taskEditId, setTaskEditId] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
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

  // 달력/요약에서 클릭 시 하단 목록의 해당 건으로 스크롤·강조
  const [highlightId, setHighlightId] = useState(null);
  const focusEvent = (ev) => {
    const d = new Date(ev.start_date);
    setView({ y: d.getFullYear(), m: d.getMonth() }); // 그 달로 이동
    setHighlightId(ev.id);
  };
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`sch-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId]);

  // 일정별 행사 기간 + 납품/회수 일시 인라인 편집
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

  const isTask = (ev) => ev.kind === "task";

  // 그날의 납품/회수 액션 + 장비 배치(납품~회수) 기간 여부 (행사 외 업무는 제외)
  const dayInfo = (ds) => ({
    installs: schedules.filter((ev) => !isTask(ev) && ev.start_date === ds),
    pickups: schedules.filter(
      (ev) =>
        !isTask(ev) &&
        usageOf(ev) !== "제작" &&
        (ev.end_date || ev.start_date) === ds
    ),
    tasks: schedules.filter((ev) => isTask(ev) && ev.start_date === ds),
    deployed: schedules.some(
      (ev) => !isTask(ev) && ev.start_date <= ds && ds <= (ev.end_date || ev.start_date)
    ),
  });

  // 오늘/내일 요약용 (납품/회수 발생 목록)
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  const tomorrow = dstr(tmr.getFullYear(), tmr.getMonth(), tmr.getDate());
  const occFor = (ds) => {
    const list = [];
    schedules.forEach((ev) => {
      if (isTask(ev)) {
        if (ev.start_date === ds)
          list.push({ type: "업무", ev, time: hm(ev.start_time) });
        return;
      }
      if (ev.start_date === ds)
        list.push({ type: "납품", ev, time: hm(ev.start_time) });
      if (usageOf(ev) !== "제작" && (ev.end_date || ev.start_date) === ds)
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
    .sort((a, b) => {
      // 종류 무관 — 날짜 → 시간 순
      if (a.start_date !== b.start_date) return a.start_date < b.start_date ? -1 : 1;
      return (hm(a.start_time) || "99:99").localeCompare(hm(b.start_time) || "99:99");
    });

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
            납품/회수 일정이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {list.map((o, i) => (
              <li
                key={i}
                onClick={() => focusEvent(o.ev)}
                className="flex cursor-pointer items-center gap-2 px-4 py-2.5 hover:bg-ink/[0.02]"
              >
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    o.type === "납품"
                      ? "bg-blue-100 text-blue-700"
                      : o.type === "회수"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {o.type}
                </span>
                {o.time && (
                  <span
                    className={`shrink-0 text-xs font-bold ${
                      o.type === "납품"
                        ? "text-blue-700"
                        : o.type === "회수"
                        ? "text-amber-700"
                        : "text-slate-600"
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
      {/* 뷰 전환: 일정 / 배차 */}
      <div className="inline-flex rounded-lg border border-ink/10 bg-white p-0.5">
        {[
          ["list", "일정"],
          ["dispatch", "상세"],
        ].map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            className={`rounded-md px-4 py-1.5 text-sm font-bold transition ${
              mode === v ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "dispatch" ? (
        <DispatchView schedules={schedules} scheduleItems={scheduleItems} />
      ) : (
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

        {/* 액션 중심: 각 날짜에 그날의 납품/회수만 표시 */}
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (d === null)
              return <div key={i} className="min-h-24 border border-transparent" />;
            const ds = dstr(y, m, d);
            const isToday = ds === today;
            const past = ds < today;
            const col = i % 7;
            const { installs, pickups, tasks, deployed } = dayInfo(ds);

            const taskChip = (ev) => {
              const t = hm(ev.start_time);
              return (
                <div
                  key={`task-${ev.id}`}
                  onClick={() => focusEvent(ev)}
                  title={`업무 · ${ev.title}${t ? ` ${t}` : ""}`}
                  className={`flex cursor-pointer items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                    past ? "bg-ink/[0.05] text-ink/40" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  <span className="shrink-0 font-bold">업무</span>
                  {t && <span className="shrink-0 font-semibold">{t}</span>}
                  <span className="truncate">{ev.title}</span>
                </div>
              );
            };

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
                  onClick={() => focusEvent(ev)}
                  title={`${kind === "install" ? "납품" : "회수"} · ${ev.title}${t ? ` ${t}` : ""}`}
                  className={`flex cursor-pointer items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] leading-tight ${cls}`}
                >
                  <span className="shrink-0 font-bold">
                    {kind === "install" ? "▶납품" : "◀회수"}
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
                  isToday ? "bg-violet-50" : deployed ? "bg-ink/[0.02]" : ""
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-violet-600 font-bold text-white"
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
                  {[
                    ...installs.map((ev) => ({ t: "install", ev, time: hm(ev.start_time) })),
                    ...pickups.map((ev) => ({ t: "pickup", ev, time: hm(ev.end_time) })),
                    ...tasks.map((ev) => ({ t: "task", ev, time: hm(ev.start_time) })),
                  ]
                    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
                    .map((c) => (c.t === "task" ? taskChip(c.ev) : chip(c.t, c.ev)))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink/5 pt-3 text-[11px] text-ink/50">
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-blue-100 px-1 py-0.5 font-bold text-blue-800">▶납품</span>{" "}
            납품 나가는 날
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-amber-100 px-1 py-0.5 font-bold text-amber-800">◀회수</span>{" "}
            회수 나가는 날
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-slate-200 px-1 py-0.5 font-bold text-slate-700">업무</span>{" "}
            행사 외 일정
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm bg-ink/[0.04]" /> 장비 나가있는 기간
          </span>
        </div>
      </div>

      {/* 행사 외 일정 추가 (목록 위) */}
      {!showTaskAdd ? (
        <button
          type="button"
          onClick={() => {
            setNewTask(emptyTask);
            setShowTaskAdd(true);
          }}
          className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
        >
          + 행사 외 일정 추가
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const res = await createTask(newTask);
              if (!res?.error) {
                setNewTask(emptyTask);
                setShowTaskAdd(false);
              }
              return res;
            });
          }}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">행사 외 일정 추가</p>
            <button
              type="button"
              onClick={() => setShowTaskAdd(false)}
              className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/50 hover:bg-ink/5"
            >
              접기
            </button>
          </div>
          <p className="mt-1 text-xs text-ink/45">
            날짜·시간과 업무 내용만 적으면 됩니다. (예: 창고 정리, 거래처 미팅)
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">날짜</label>
              <DatePicker
                value={newTask.date}
                onChange={(v) => setNewTask((f) => ({ ...f, date: v }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">시간 (선택)</label>
              <TimeSelect
                value={newTask.start_time}
                onChange={(v) => setNewTask((f) => ({ ...f, start_time: v }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink/60">업무 내용</label>
              <input
                value={newTask.title}
                onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
                placeholder="예: 창고 정리 / 거래처 미팅"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink/60">메모 (선택)</label>
              <input
                value={newTask.memo}
                onChange={(e) => setNewTask((f) => ({ ...f, memo: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-4 rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
          >
            {pending ? "처리 중..." : "업무 일정 추가"}
          </button>
        </form>
      )}

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
              const usage = usageOf(ev);

              // 행사 외(업무) 일정 — 간단 레이아웃
              if (isTask(ev)) {
                const editing = taskEditId === ev.id;
                return (
                  <li
                    key={ev.id}
                    id={`sch-${ev.id}`}
                    className={`transition-colors ${highlightId === ev.id ? "bg-primary/10" : ""}`}
                  >
                    {editing ? (
                      <div className="space-y-2.5 bg-ink/[0.015] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-10 shrink-0 text-xs font-bold text-slate-600">날짜</span>
                          <div className="w-36">
                            <DatePicker
                              value={taskForm.date}
                              onChange={(v) => setTaskForm((f) => ({ ...f, date: v }))}
                            />
                          </div>
                          <TimeSelect
                            value={taskForm.start_time}
                            onChange={(v) => setTaskForm((f) => ({ ...f, start_time: v }))}
                          />
                        </div>
                        <input
                          value={taskForm.title}
                          onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="업무 내용"
                          className={inputCls}
                        />
                        <input
                          value={taskForm.memo}
                          onChange={(e) => setTaskForm((f) => ({ ...f, memo: e.target.value }))}
                          placeholder="메모 (선택)"
                          className={inputCls}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(async () => {
                                const res = await updateTask(ev.id, taskForm);
                                if (res?.error) alert(res.error);
                                else setTaskEditId(null);
                                return res;
                              })
                            }
                            className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskEditId(null)}
                            className="rounded-md border border-ink/15 px-3 py-1.5 text-xs text-ink/60 hover:bg-ink/5"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                        <span className={`w-full shrink-0 text-xs sm:w-52 ${past ? "text-ink/35" : "text-ink/70"}`}>
                          <span className="mr-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 align-middle">
                            업무
                          </span>
                          {ev.start_date}
                          {ev.start_time ? ` ${hm(ev.start_time)}` : ""}
                          {ev.end_time ? ` ~ ${hm(ev.end_time)}` : ""}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold ${past ? "text-ink/40" : "text-ink"}`}>
                            {ev.title}
                          </p>
                          {ev.memo && (
                            <p className={`truncate text-xs ${past ? "text-ink/30" : "text-ink/50"}`}>
                              {ev.memo}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTaskEditId(ev.id);
                            setTaskForm({
                              date: ev.start_date || "",
                              start_time: hm(ev.start_time),
                              end_time: hm(ev.end_time),
                              title: ev.title || "",
                              memo: ev.memo || "",
                            });
                          }}
                          className="shrink-0 rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-ink/5"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`'${ev.title}' 업무를 삭제할까요?`))
                              run(() => deleteSchedule(ev.id));
                          }}
                          className="shrink-0 rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li
                  key={ev.id}
                  id={`sch-${ev.id}`}
                  className={`transition-colors ${
                    highlightId === ev.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="px-4 py-3">
                   <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
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
                        <b className={past ? "text-ink/35" : "text-blue-700"}>납품</b>{" "}
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
                        {usage && (
                          <span
                            className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium align-middle ${
                              usage === "제작"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {usage}
                          </span>
                        )}
                      </p>
                      {ev.location && (
                        <p className={`mt-0.5 flex items-start gap-1 break-words text-xs ${past ? "text-ink/40" : "text-ink/60"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-[1px] shrink-0 text-ink/40">
                            <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          <span className="min-w-0">{ev.location}</span>
                        </p>
                      )}
                      {(ev.client_manager || ev.client_phone) && (
                        <p className={`truncate text-xs ${past ? "text-ink/30" : "text-ink/45"}`}>
                          {ev.client_manager}
                          {ev.client_phone ? ` (${ev.client_phone})` : ""}
                        </p>
                      )}
                      {ev.note && (
                        <p className={`mt-1 whitespace-pre-wrap break-words rounded bg-amber-50 px-2 py-1 text-xs ${past ? "text-ink/40" : "text-ink/70"}`}>
                          <span className="font-bold text-amber-700">특이사항</span>{" "}
                          {ev.note}
                        </p>
                      )}
                    </div>
                   </div>

                   {/* 진행 단계: 디자인 발주 → 랩핑 → 출고 → 회수 */}
                   <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-0.5">
                     {STAGES.map((s, i) => {
                       const step = i + 1;
                       const cur = (ev.stage || 0) === step;
                       const done = (ev.stage || 0) >= step;
                       return (
                         <div key={s} className="flex items-center">
                           <button
                             type="button"
                             disabled={pending || step > (ev.stage || 0) + 1}
                             onClick={() =>
                               run(() => setScheduleStage(ev.id, cur ? i : step))
                             }
                             title={
                               step > (ev.stage || 0) + 1
                                 ? "이전 단계를 먼저 진행하세요"
                                 : done
                                 ? `${s} 완료 (클릭해 되돌리기)`
                                 : `${s}(으)로 진행`
                             }
                             className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                               done
                                 ? "bg-emerald-600 text-white"
                                 : "bg-ink/5 text-ink/45 hover:bg-ink/10"
                             } ${cur ? "ring-2 ring-emerald-300" : ""} ${
                               step > (ev.stage || 0) + 1 ? "cursor-not-allowed opacity-40" : ""
                             }`}
                           >
                             {done ? "✓ " : ""}
                             {s}
                           </button>
                           {i < STAGES.length - 1 && (
                             <span
                               className={`h-0.5 w-3 shrink-0 ${
                                 (ev.stage || 0) > step ? "bg-emerald-500" : "bg-ink/15"
                               }`}
                             />
                           )}
                         </div>
                       );
                     })}
                     {(ev.stage || 0) >= 4 && (
                       <span className="ml-1.5 shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                         완료
                       </span>
                     )}
                   </div>

                   {/* 단계별 체크 시각 */}
                   {(ev.stage || 0) >= 1 && ev.stage_dates && (
                     <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-ink/45">
                       {STAGES.slice(0, ev.stage || 0).map((s, i) => {
                         const ts = ev.stage_dates?.[String(i + 1)];
                         return (
                           <span key={s}>
                             <b className="font-semibold text-ink/55">{s}</b>{" "}
                             {ts ? fmtStamp(ts) : "-"}
                           </span>
                         );
                       })}
                     </div>
                   )}

                   {/* 출력물 발주 단계 → 발주처(거래처) 선택 */}
                   {(ev.stage || 0) >= 1 && (
                     <div className="mt-2 flex flex-wrap items-center gap-2">
                       <span className="text-xs font-bold text-ink/50">발주처</span>
                       <select
                         value={ev.vendor || ""}
                         disabled={pending}
                         onChange={(e) => run(() => setScheduleVendor(ev.id, e.target.value))}
                         className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs outline-none focus:border-primary"
                       >
                         <option value="">선택 안 함</option>
                         {vendors.map((v) => (
                           <option key={v} value={v}>
                             {v}
                           </option>
                         ))}
                         {ev.vendor && !vendors.includes(ev.vendor) && (
                           <option value={ev.vendor}>{ev.vendor}</option>
                         )}
                       </select>
                       <button
                         type="button"
                         disabled={pending}
                         onClick={() => {
                           const name = window.prompt("새 거래처 이름");
                           if (name && name.trim())
                             run(async () => {
                               const res = await createVendor(name);
                               if (!res?.error) await setScheduleVendor(ev.id, name.trim());
                               return res;
                             });
                         }}
                         className="rounded-md border border-ink/15 px-2 py-1 text-xs text-ink/60 hover:bg-ink/5 disabled:opacity-50"
                       >
                         + 거래처
                       </button>
                       {(() => {
                         const its = itemsBySchedule(ev.id).filter(
                           (x) => Number(x.quantity) > 0
                         );
                         const total = its.reduce(
                           (a, b) => a + Number(b.quantity),
                           0
                         );
                         return (
                           <span className="text-xs text-ink/55">
                             · 발주 수량{" "}
                             {its.length ? (
                               <b className="text-ink/80">
                                 {its
                                   .map((x) => `${x.category} ${x.quantity}대`)
                                   .join(" · ")}
                               </b>
                             ) : (
                               <span className="text-ink/40">기기 배정 없음</span>
                             )}
                           </span>
                         );
                       })()}
                     </div>
                   )}

                   {/* 액션 버튼 (아래 줄, 우측 정렬) */}
                   <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEquipEditId((v) => (v === ev.id ? null : ev.id))
                      }
                      className={`relative shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${
                        equipEditId === ev.id
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-ink/15 text-ink/70 hover:bg-ink/5"
                      }`}
                    >
                      기기
                      {itemsBySchedule(ev.id).length > 0 && (
                        <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">
                          {itemsBySchedule(ev.id).length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInfoEditId((v) => (v === ev.id ? null : ev.id))}
                      className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${
                        infoEditId === ev.id
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-ink/15 text-ink/70 hover:bg-ink/5"
                      }`}
                    >
                      정보
                    </button>
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
                  </div>

                  {/* 납품/회수 일시 인라인 편집 */}
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
                        <span className="w-10 shrink-0 text-xs font-bold text-blue-700">납품</span>
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

                  {/* 기기 배정 패널 */}
                  {equipEditId === ev.id && (
                    <ScheduleEquipment
                      schedule={ev}
                      totals={equipmentTotals}
                      categories={equipmentCategories}
                      items={scheduleItems}
                      schedById={schedById}
                    />
                  )}

                  {/* 현장 정보 패널 */}
                  {infoEditId === ev.id && <ScheduleInfo schedule={ev} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
