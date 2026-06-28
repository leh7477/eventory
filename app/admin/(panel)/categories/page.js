import { createAdminClient } from "@/lib/supabase/admin";
import CategoriesManager from "@/components/admin/CategoriesManager";

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const admin = createAdminClient();
  const { data: categories } = await admin
    .from("categories")
    .select("*")
    .order("order_num", { ascending: true });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">카테고리 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        장비 카테고리를 추가·수정·삭제하고 순서를 변경합니다.
      </p>

      <div className="mt-6">
        <CategoriesManager categories={categories ?? []} />
      </div>
    </div>
  );
}
