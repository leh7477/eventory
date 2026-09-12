import { createAdminClient } from "@/lib/supabase/admin";
import InquiriesManager from "@/components/admin/InquiriesManager";

export const revalidate = 0;

export default async function AdminInquiriesPage() {
  const admin = createAdminClient();
  const [{ data }, { data: equipment }, { data: items }, { data: scheds }] =
    await Promise.all([
      admin.from("inquiries").select("*").order("created_at", { ascending: false }),
      admin.from("equipment").select("category, active"),
      admin.from("schedule_items").select("schedule_id, category, quantity"),
      admin.from("schedules").select("id, inquiry_id, start_date, end_date"),
    ]);

  const list = data ?? [];
  const unread = list.filter((x) => !x.is_read).length;

  // 재고 확인용 데이터
  const totals = {};
  for (const e of equipment ?? []) {
    if (!e.active || !e.category) continue;
    totals[e.category] = (totals[e.category] || 0) + 1;
  }
  const categories = Object.keys(totals).sort((a, b) => a.localeCompare(b));
  const schedById = Object.fromEntries(
    (scheds ?? []).map((s) => [s.id, { start_date: s.start_date, end_date: s.end_date }])
  );
  // 일정이 등록된 문의 id 목록
  const scheduledInquiryIds = [
    ...new Set((scheds ?? []).map((s) => s.inquiry_id).filter(Boolean)),
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">견적 문의</h1>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
            미확인 {unread}
          </span>
        )}
        <span className="text-sm text-ink/40">총 {list.length}건</span>
      </div>
      <p className="mt-1 text-sm text-ink/50">
        상태·기간·검색으로 필터할 수 있습니다. 클릭하면 상세가 열리고 자동으로
        읽음 처리됩니다.
      </p>

      <div className="mt-6">
        <InquiriesManager
          inquiries={list}
          equipmentTotals={totals}
          equipmentCategories={categories}
          scheduleItems={items ?? []}
          schedById={schedById}
          scheduledInquiryIds={scheduledInquiryIds}
        />
      </div>
    </div>
  );
}
