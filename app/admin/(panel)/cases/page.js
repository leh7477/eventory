import { createAdminClient } from "@/lib/supabase/admin";
import CaseManager from "@/components/admin/CaseManager";

export const revalidate = 0;

export default async function AdminCasesPage() {
  const admin = createAdminClient();
  const [{ data: cases }, { data: categories }] = await Promise.all([
    admin.from("cases").select("*").order("order_num", { ascending: true }),
    admin.from("categories").select("*").order("order_num", { ascending: true }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Stories 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        행사 사례를 등록합니다. 사진 여러 장을 올리면 상세 페이지에 현장 사진으로
        쭉 노출됩니다.
      </p>

      <div className="mt-6">
        <CaseManager cases={cases ?? []} categories={categories ?? []} />
      </div>
    </div>
  );
}
