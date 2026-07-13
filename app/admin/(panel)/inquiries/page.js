import { createAdminClient } from "@/lib/supabase/admin";
import InquiriesManager from "@/components/admin/InquiriesManager";

export const revalidate = 0;

export default async function AdminInquiriesPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  const list = data ?? [];
  const unread = list.filter((x) => !x.is_read).length;

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
        <InquiriesManager inquiries={list} />
      </div>
    </div>
  );
}
