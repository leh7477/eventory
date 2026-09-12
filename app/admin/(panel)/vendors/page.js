import { createAdminClient } from "@/lib/supabase/admin";
import VendorsManager from "@/components/admin/VendorsManager";
import { kstDate } from "@/lib/date";

export const revalidate = 0;

export default async function AdminVendorsPage() {
  const admin = createAdminClient();
  const [{ data: vendors, error }, { data: scheds }, { data: items }] =
    await Promise.all([
      admin.from("vendors").select("*").order("name", { ascending: true }),
      admin.from("schedules").select("id, vendor, stage, stage_dates, start_date"),
      admin.from("schedule_items").select("schedule_id, quantity"),
    ]);

  // 일정별 기기 수량 합계
  const devCount = {};
  for (const it of items ?? [])
    devCount[it.schedule_id] = (devCount[it.schedule_id] || 0) + (Number(it.quantity) || 0);

  // 거래처별 월별 발주 개수 (출력물 발주 단계≥1, 기기 수량 기준)
  // 발주 월 = 출력물 발주 체크시각(stage_dates["1"]) 기준, 없으면 설치일 기준
  const statsByVendor = {};
  for (const s of scheds ?? []) {
    if (!s.vendor || (s.stage || 0) < 1) continue;
    const iso =
      s.stage_dates && typeof s.stage_dates === "object" ? s.stage_dates["1"] : null;
    const month = iso ? kstDate(new Date(iso)).slice(0, 7) : (s.start_date || "").slice(0, 7);
    if (!month) continue;
    const cnt = devCount[s.id] || 0;
    statsByVendor[s.vendor] = statsByVendor[s.vendor] || {};
    statsByVendor[s.vendor][month] = (statsByVendor[s.vendor][month] || 0) + cnt;
  }

  const tableMissing =
    !!error &&
    /vendors.*does not exist|Could not find the table/i.test(error.message || "");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">거래처 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        출력물 발주 등에 쓰는 거래처(발주처)를 등록·관리합니다. 여기 등록한
        거래처는 일정의 <b>출력물 발주</b> 단계에서 선택할 수 있고, 나중에 정산에
        활용됩니다.
      </p>

      {tableMissing ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">거래처 테이블이 아직 없습니다.</p>
          <p className="mt-1">Supabase → SQL Editor에서 아래 SQL을 실행해주세요.</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink/90 p-3 text-xs leading-relaxed text-white">{`create table if not exists vendors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  memo text,
  created_at timestamptz default now()
);
alter table vendors enable row level security;`}</pre>
        </div>
      ) : (
        <div className="mt-6">
          <VendorsManager vendors={vendors ?? []} statsByVendor={statsByVendor} />
        </div>
      )}
    </div>
  );
}
