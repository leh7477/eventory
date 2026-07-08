import { createAdminClient } from "@/lib/supabase/admin";
import ScheduleManager from "@/components/admin/ScheduleManager";

export const revalidate = 0;

export default async function AdminSchedulePage() {
  const admin = createAdminClient();
  const { data: schedules } = await admin
    .from("schedules")
    .select("*")
    .order("start_date", { ascending: true });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">일정 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        확정된 행사 일정을 관리합니다. 견적 문의에서 &lsquo;일정 등록&rsquo;을
        누르면 자동으로 추가됩니다.
      </p>

      <div className="mt-6">
        <ScheduleManager schedules={schedules ?? []} />
      </div>
    </div>
  );
}
