import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayKST, kstPlusDays } from "@/lib/date";

export const revalidate = 0;

const pad = (n) => String(n).padStart(2, "0");
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (t) => (t ? String(t).slice(0, 5) : null);

// 일정 → 납품/회수 발생일로 분리
// 납품 = 시작일(시작 시간), 회수 = 종료일(종료 시간)
// 제작은 회수 없는 '납품만' 일정 (memo의 '용도: 제작')
const isDeliveryOnly = (ev) =>
  String(ev?.memo || "")
    .split("\n")
    .some((l) => l.trim() === "용도: 제작");

function toOccurrences(schedules) {
  const occ = [];
  schedules.forEach((ev) => {
    if (ev.cancelled) return;
    const end = ev.end_date || ev.start_date;
    occ.push({ type: "납품", date: ev.start_date, time: hm(ev.start_time), ev });
    if (!isDeliveryOnly(ev))
      occ.push({ type: "회수", date: end, time: hm(ev.end_time), ev });
  });
  occ.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      (a.time ?? "99").localeCompare(b.time ?? "99")
  );
  return occ;
}

// 납품 준비 경고 — 진행 단계(stage: 1=출력물 발주, 2=랩핑, 3=출고 완료)
//  오늘·내일 모두 랩핑 전(stage<2)이면 경고 → 다음 할 단계(출력물 발주 전 / 랩핑 전)
//  랩핑까지 끝나 출고만 남은 경우(stage=2)는 경고 없음 (출고는 납품 당일에 하는 일이라)
//  회수·업무는 경고 없음.
function prepWarning(o) {
  if (o.type !== "납품") return null;
  const st = Number(o.ev.stage) || 0;
  if (st < 2) return st < 1 ? "출력물 발주 전" : "랩핑 전";
  return null;
}

function OccurrenceItem({ o, showDate, warn }) {
  const badge =
    o.type === "납품"
      ? "bg-blue-100 text-blue-700"
      : o.type === "회수"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-200 text-slate-700";
  const timeColor =
    o.type === "납품"
      ? "text-blue-700"
      : o.type === "회수"
      ? "text-amber-700"
      : "text-slate-600";
  const sub = o.ev.location || o.ev.memo || "";
  return (
    <li className="px-5 py-3">
      <p className="text-sm font-semibold text-ink">
        <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold align-middle ${badge}`}>
          {o.type}
        </span>
        {o.time && <span className={`mr-1.5 font-bold ${timeColor}`}>{o.time}</span>}
        {o.ev.title}
        {warn && (
          <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 align-middle">
            ⚠ {warn}
          </span>
        )}
      </p>
      {(showDate || sub) && (
        <p className="mt-0.5 text-xs text-ink/50">
          {showDate ? `${o.date}${sub ? " · " : ""}` : ""}
          {sub}
        </p>
      )}
    </li>
  );
}

function ScheduleGroup({ title, occurrences, emptyText, showDate = false, dayKind }) {
  // dayKind가 있는 목록(오늘·내일)에서만 경고 표시
  const warnOf = (o) => (dayKind ? prepWarning(o) : null);
  const warnCount = occurrences.filter((o) => warnOf(o)).length;
  const deliver = occurrences.filter((o) => o.type === "납품").length;
  const pickup = occurrences.filter((o) => o.type === "회수").length;
  const task = occurrences.filter((o) => o.type === "업무").length;
  return (
    <div className="rounded-2xl border border-ink/10 bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-ink/10 px-5 py-3">
        <p className="text-sm font-bold text-ink">
          {title}
          <span className="ml-1.5 text-ink/40">({occurrences.length})</span>
        </p>
        <span className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
            납품 {deliver}
          </span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
            회수 {pickup}
          </span>
          {task > 0 && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700">
              업무 {task}
            </span>
          )}
          {warnCount > 0 && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
              ⚠ 준비 {warnCount}
            </span>
          )}
        </span>
      </div>
      {occurrences.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-ink/35">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-ink/5">
          {occurrences.map((o, i) => (
            <OccurrenceItem
              key={`${o.ev.id}-${o.type}-${i}`}
              o={o}
              showDate={showDate}
              warn={warnOf(o)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function DashboardPage({ searchParams }) {
  const admin = createAdminClient();

  // 날짜 계산 — 한국시간(KST) 기준 오늘/내일
  const todayS = todayKST();
  const tomorrowS = kstPlusDays(1);

  // 납품/회수 건수를 볼 달 — ?month=YYYY-MM (없거나 형식이 틀리면 이번 달, KST)
  const ymNow = todayS.slice(0, 7);
  const monthParam = String(searchParams?.month || "");
  const ymSel = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : ymNow;
  const [ySel, mSel] = ymSel.split("-").map(Number);
  const monthStart = `${ymSel}-01`;
  const monthEnd = `${ymSel}-${pad(new Date(Date.UTC(ySel, mSel, 0)).getUTCDate())}`;
  const shiftYm = (delta) => {
    const d = new Date(Date.UTC(ySel, mSel - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  };
  const isCurrentMonth = ymSel === ymNow;
  // 이번 달이면 "이번 달", 다른 달이면 "2026년 8월" 식으로 표기
  const monthLabel = isCurrentMonth ? "이번 달" : `${ySel}년 ${mSel}월`;

  const [inqRes, schRes, schedInqRes, monthSchRes] = await Promise.all([
    admin
      .from("inquiries")
      .select("id, status, is_read, created_at, event_start, event_end"),
    admin
      .from("schedules")
      .select("*")
      .lte("start_date", tomorrowS) // 오늘·내일 일정만 필요
      .order("start_date", { ascending: true }),
    admin.from("schedules").select("inquiry_id"), // 일정 등록된 문의 id (진행중 제외용)
    // 선택한 달에 행사 시작일·납품(시작일)·회수(종료일) 중 하나라도 걸리는 일정
    admin
      .from("schedules")
      .select("id, kind, cancelled, start_date, end_date, event_start, memo")
      .or(
        `and(start_date.gte.${monthStart},start_date.lte.${monthEnd}),and(end_date.gte.${monthStart},end_date.lte.${monthEnd}),and(event_start.gte.${monthStart},event_start.lte.${monthEnd})`
      ),
  ]);

  const schedules = schRes.data ?? [];
  const scheduledSet = new Set(
    (schedInqRes.data ?? []).map((s) => s.inquiry_id).filter(Boolean)
  );
  const isTask = (ev) => ev.kind === "task";

  // 행사(납품/회수 발생) + 업무를 하나로 합쳐 날짜별 · 시간순
  const eventOcc = toOccurrences(schedules.filter((ev) => !isTask(ev)));
  const taskOcc = schedules
    .filter((ev) => isTask(ev) && !ev.cancelled)
    .map((ev) => ({ type: "업무", date: ev.start_date, time: hm(ev.start_time), ev }));
  const allOcc = [...eventOcc, ...taskOcc].sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      (a.time ?? "99").localeCompare(b.time ?? "99")
  );
  const todayOcc = allOcc.filter((o) => o.date === todayS);
  const tomorrowOcc = allOcc.filter((o) => o.date === tomorrowS);

  // 문의 KPI
  const inquiries = inqRes.data ?? [];
  const ym = todayS.slice(0, 7); // KST 기준 이번 달
  const unread = inquiries.filter((q) => !q.is_read).length;
  const monthCount = inquiries.filter(
    (q) => (q.created_at || "").slice(0, 7) === ym
  ).length;

  // 진행중 = 신규/견적발송/확정 중 완료·만료·취소가 아닌 활성 건
  // (확정 + 일정 등록까지 끝난 건은 일정 관리로 넘어갔으므로 제외)
  const isActive = (q) => {
    const s = q.status || "new";
    if (!["new", "quoted", "confirmed"].includes(s)) return false;
    if ((s === "new" || s === "quoted") && q.event_start && q.event_start < todayS)
      return false; // 만료
    if (s === "confirmed" && q.event_end && q.event_end < todayS) return false; // 완료
    if (s === "confirmed" && scheduledSet.has(q.id)) return false; // 일정 등록됨
    return true;
  };
  const activeCount = inquiries.filter(isActive).length;

  // 선택한 달의 납품/회수 건수 (취소·업무 제외, 제작은 회수 없음)
  //  납품 = 시작일이 이번 달, 회수 = 종료일이 이번 달
  const inMonth = (d) => !!d && d >= monthStart && d <= monthEnd;
  let monthEvents = 0;
  let monthDeliver = 0;
  let monthPickup = 0;
  (monthSchRes.data ?? []).forEach((ev) => {
    if (ev.cancelled || isTask(ev)) return;
    if (inMonth(ev.start_date)) monthDeliver++;
    if (!isDeliveryOnly(ev) && inMonth(ev.end_date || ev.start_date)) monthPickup++;
    // 행사 = 행사 시작일 기준(비어 있으면 납품일로 대신), 제작 건은 행사가 아니라 제외
    if (!isDeliveryOnly(ev) && inMonth(ev.event_start || ev.start_date)) monthEvents++;
  });

  const kpis = [
    { label: "미확인 문의", value: `${unread}건`, href: "/admin/inquiries", hl: unread > 0 },
    { label: "진행중 문의", value: `${activeCount}건`, href: "/admin/inquiries" },
    { label: "이번 달 문의", value: `${monthCount}건`, href: "/admin/inquiries" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">대시보드</h1>
      <p className="mt-1 text-sm text-ink/50">이벤트랜드 관리자 페이지입니다.</p>

      {/* KPI 카드 */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {kpis.map((c) => {
          const inner = (
            <div
              className={`h-full rounded-xl border p-3 transition sm:p-4 ${
                c.hl
                  ? "border-primary/30 bg-primary/5"
                  : "border-ink/10 bg-white"
              } ${c.href ? "hover:shadow-sm" : ""}`}
            >
              <p
                className={`break-keep text-[11px] sm:text-xs ${
                  c.hl ? "font-bold text-primary" : "text-ink/50"
                }`}
              >
                {c.label}
              </p>
              <p
                className={`mt-1 text-xl font-extrabold sm:text-2xl ${
                  c.hl ? "text-primary" : "text-ink"
                }`}
              >
                {c.value}
              </p>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block min-w-0">
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="min-w-0">
              {inner}
            </div>
          );
        })}
      </div>

      {/* 월별 행사/납품/회수 건수 — 화살표로 달 이동 */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-ink">행사·납품·회수 건수</p>
        <div className="flex items-center gap-1">
          <Link
            href={`/admin/dashboard?month=${shiftYm(-1)}`}
            aria-label="이전 달"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/15 text-ink/60 hover:bg-ink/5"
          >
            ‹
          </Link>
          <span className="min-w-[88px] text-center text-sm font-bold text-ink">
            {ySel}. {pad(mSel)}
          </span>
          <Link
            href={`/admin/dashboard?month=${shiftYm(1)}`}
            aria-label="다음 달"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/15 text-ink/60 hover:bg-ink/5"
          >
            ›
          </Link>
        </div>
        {!isCurrentMonth && (
          <Link
            href="/admin/dashboard"
            className="rounded-md border border-ink/15 px-2 py-1 text-xs font-bold text-ink/60 hover:bg-ink/5"
          >
            이번 달로
          </Link>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3">
        <Link href="/admin/schedule" className="block min-w-0">
          <div className="h-full rounded-xl border border-ink/10 bg-white p-3 transition hover:shadow-sm sm:p-4">
            <p className="break-keep text-[11px] text-ink/50 sm:text-xs">
              {monthLabel} 행사
            </p>
            <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">
              {monthEvents}건
            </p>
          </div>
        </Link>
        <Link href="/admin/schedule" className="block min-w-0">
          <div className="h-full rounded-xl border border-blue-200 bg-blue-50 p-3 transition hover:shadow-sm sm:p-4">
            <p className="break-keep text-[11px] text-blue-700/70 sm:text-xs">
              {monthLabel} 납품
            </p>
            <p className="mt-1 text-xl font-extrabold text-blue-700 sm:text-2xl">
              {monthDeliver}건
            </p>
          </div>
        </Link>
        <Link href="/admin/schedule" className="block min-w-0">
          <div className="h-full rounded-xl border border-amber-200 bg-amber-50 p-3 transition hover:shadow-sm sm:p-4">
            <p className="break-keep text-[11px] text-amber-700/70 sm:text-xs">
              {monthLabel} 회수
            </p>
            <p className="mt-1 text-xl font-extrabold text-amber-700 sm:text-2xl">
              {monthPickup}건
            </p>
          </div>
        </Link>
      </div>

      {/* 일정 요약 */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">일정</h2>
        <Link href="/admin/schedule" className="text-sm text-ink/50 hover:text-primary">
          전체 일정 보기 →
        </Link>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <ScheduleGroup
          title="오늘 일정"
          dayKind="today"
          occurrences={todayOcc}
          emptyText="오늘 일정이 없습니다."
        />
        <ScheduleGroup
          title="내일 일정"
          dayKind="tomorrow"
          occurrences={tomorrowOcc}
          emptyText="내일 일정이 없습니다."
        />
      </div>
    </div>
  );
}
