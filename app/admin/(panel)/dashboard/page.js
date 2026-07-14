import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0;

const pad = (n) => String(n).padStart(2, "0");
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (t) => (t ? String(t).slice(0, 5) : null);

// 일정 → 설치/회수 발생일로 분리
// 설치 = 시작일(시작 시간), 회수 = 종료일(종료 시간)
function toOccurrences(schedules) {
  const occ = [];
  schedules.forEach((ev) => {
    const end = ev.end_date || ev.start_date;
    occ.push({ type: "설치", date: ev.start_date, time: hm(ev.start_time), ev });
    occ.push({ type: "회수", date: end, time: hm(ev.end_time), ev });
  });
  occ.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      (a.time ?? "99").localeCompare(b.time ?? "99")
  );
  return occ;
}

function OccurrenceItem({ o, showDate }) {
  return (
    <li className="px-5 py-3">
      <p className="text-sm font-semibold text-ink">
        <span
          className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold align-middle ${
            o.type === "설치"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {o.type}
        </span>
        {o.time && (
          <span
            className={`mr-1.5 font-bold ${
              o.type === "설치" ? "text-blue-700" : "text-amber-700"
            }`}
          >
            {o.time}
          </span>
        )}
        {o.ev.title}
      </p>
      <p className="mt-0.5 text-xs text-ink/50">
        {showDate ? `${o.date} · ` : ""}
        {o.ev.location || ""}
      </p>
    </li>
  );
}

function ScheduleGroup({ title, occurrences, emptyText, showDate = false }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white">
      <p className="border-b border-ink/10 px-5 py-3 text-sm font-bold text-ink">
        {title}
        <span className="ml-1.5 text-ink/40">({occurrences.length})</span>
      </p>
      {occurrences.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-ink/35">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-ink/5">
          {occurrences.map((o, i) => (
            <OccurrenceItem key={`${o.ev.id}-${o.type}-${i}`} o={o} showDate={showDate} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const admin = createAdminClient();

  // 날짜 계산 (오늘 / 내일 / 금주 = 일~토)
  const now = new Date();
  const todayS = ds(now);
  const tm = new Date(now);
  tm.setDate(now.getDate() + 1);
  const tomorrowS = ds(tm);
  // 금주 = 월요일 ~ 일요일 기준 → 이번 주 일요일까지
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + (now.getDay() === 0 ? 0 : 7 - now.getDay()));
  const weekEndS = ds(weekEnd);

  const [inqRes, schRes] = await Promise.all([
    admin
      .from("inquiries")
      .select("status, is_read, created_at, event_start, event_end"),
    admin
      .from("schedules")
      .select("*")
      .lte("start_date", weekEndS)
      .order("start_date", { ascending: true }),
  ]);

  const schedules = schRes.data ?? [];
  // 설치(시작일)/회수(종료일) 발생 기준으로 분리
  const occurrences = toOccurrences(schedules);
  const todayOcc = occurrences.filter((o) => o.date === todayS);
  const tomorrowOcc = occurrences.filter((o) => o.date === tomorrowS);
  // 금주: 이번 주(토요일까지) 중 오늘·내일 이후 남은 설치/회수
  const weekOcc = occurrences.filter(
    (o) => o.date > tomorrowS && o.date <= weekEndS
  );

  // 문의 KPI
  const inquiries = inqRes.data ?? [];
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const unread = inquiries.filter((q) => !q.is_read).length;
  const monthCount = inquiries.filter(
    (q) => (q.created_at || "").slice(0, 7) === ym
  ).length;

  // 진행중 = 신규/견적발송/확정 중 완료·만료·취소가 아닌 활성 건
  const isActive = (q) => {
    const s = q.status || "new";
    if (!["new", "quoted", "confirmed"].includes(s)) return false;
    if ((s === "new" || s === "quoted") && q.event_start && q.event_start < todayS)
      return false; // 만료
    if (s === "confirmed" && q.event_end && q.event_end < todayS) return false; // 완료
    return true;
  };
  const activeCount = inquiries.filter(isActive).length;

  const kpis = [
    { label: "미확인 문의", value: `${unread}건`, href: "/admin/inquiries", hl: unread > 0 },
    { label: "진행중 견적", value: `${activeCount}건`, href: "/admin/inquiries" },
    { label: "이번 달 문의", value: `${monthCount}건`, href: "/admin/inquiries" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">대시보드</h1>
      <p className="mt-1 text-sm text-ink/50">Eventory 관리자 페이지입니다.</p>

      {/* KPI 카드 */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {kpis.map((c) => {
          const inner = (
            <div
              className={`rounded-xl border p-4 transition ${
                c.hl
                  ? "border-primary/30 bg-primary/5"
                  : "border-ink/10 bg-white"
              } ${c.href ? "hover:shadow-sm" : ""}`}
            >
              <p className={`text-xs ${c.hl ? "font-bold text-primary" : "text-ink/50"}`}>
                {c.label}
              </p>
              <p
                className={`mt-1 text-2xl font-extrabold ${
                  c.hl ? "text-primary" : "text-ink"
                }`}
              >
                {c.value}
              </p>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>

      {/* 일정 요약 */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">일정</h2>
        <Link href="/admin/schedule" className="text-sm text-ink/50 hover:text-primary">
          전체 일정 보기 →
        </Link>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ScheduleGroup
          title="오늘 일정"
          occurrences={todayOcc}
          emptyText="오늘 설치/회수 일정이 없습니다."
        />
        <ScheduleGroup
          title="내일 일정"
          occurrences={tomorrowOcc}
          emptyText="내일 설치/회수 일정이 없습니다."
        />
        <ScheduleGroup
          title="금주 일정"
          occurrences={weekOcc}
          emptyText="이번 주 남은 설치/회수 일정이 없습니다."
          showDate
        />
      </div>
    </div>
  );
}
