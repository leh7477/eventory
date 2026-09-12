import { createAdminClient } from "@/lib/supabase/admin";
import ScheduleManager from "@/components/admin/ScheduleManager";

export const revalidate = 0;

export default async function AdminSchedulePage() {
  const admin = createAdminClient();

  const [{ data: schedules }, { data: equipment }, { data: items }] =
    await Promise.all([
      admin.from("schedules").select("*").order("start_date", { ascending: true }),
      admin.from("equipment").select("category, active"),
      admin.from("schedule_items").select("schedule_id, category, quantity"),
    ]);

  // 종류별 보유(운영중) 대수
  const totals = {};
  for (const e of equipment ?? []) {
    if (!e.active || !e.category) continue;
    totals[e.category] = (totals[e.category] || 0) + 1;
  }
  const categories = Object.keys(totals).sort((a, b) => a.localeCompare(b));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">일정 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        확정된 행사 일정을 관리합니다. 견적 문의에서 &lsquo;일정 등록&rsquo;을
        누르면 자동으로 추가됩니다. 각 일정에서 <b>기기</b>를 눌러 필요한 장비를
        배정하고 재고 가용 여부를 확인하세요.
      </p>

      <div className="mt-6">
        <ScheduleManager
          schedules={schedules ?? []}
          equipmentTotals={totals}
          equipmentCategories={categories}
          scheduleItems={items ?? []}
        />
      </div>
    </div>
  );
}
