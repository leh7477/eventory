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

  const [inquiries, schRes] = await Promise.all([
    admin
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false),
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

  const unread = inquiries.count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">대시보드</h1>
      <p className="mt-1 text-sm text-ink/50">Eventory 관리자 페이지입니다.</p>

      {/* 미확인 견적 문의 */}
      <Link
        href="/admin/inquiries"
        className={`mt-8 flex items-center justify-between rounded-2xl border p-6 transition hover:shadow-sm ${
          unread > 0
            ? "border-primary/30 bg-primary/5 hover:border-primary/50"
            : "border-ink/10 bg-white hover:border-ink/20"
        }`}
      >
        <div>
          <p className={`text-sm ${unread > 0 ? "font-bold text-primary" : "text-ink/50"}`}>
            미확인 견적 문의
          </p>
          <p className={`mt-1 text-xs ${unread > 0 ? "text-primary/70" : "text-ink/35"}`}>
            {unread > 0 ? "확인이 필요한 문의가 있습니다" : "모든 문의를 확인했습니다"}
          </p>
        </div>
        <p className={`text-5xl font-extrabold ${unread > 0 ? "text-primary" : "text-ink/25"}`}>
          {unread}
        </p>
      </Link>

      {/* 일정 요약 */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">일정</h2>
        <Link href="/admin/schedule" className="text-sm text-ink/50 hover:text-primary">
          전체 일정 보기 →
        </Link>
      </div>
      <div className="mt-3 grid gap-5 lg:grid-cols-3">
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
