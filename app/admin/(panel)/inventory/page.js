import { createAdminClient } from "@/lib/supabase/admin";
import InventoryManager from "@/components/admin/InventoryManager";

export const revalidate = 0;

export default async function AdminInventoryPage() {
  const admin = createAdminClient();

  const { data: equipment, error } = await admin
    .from("equipment")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  // 카테고리 입력 도우미용 (제품 카테고리)
  const { data: categories } = await admin
    .from("categories")
    .select("name")
    .order("order_num", { ascending: true });

  const tableMissing =
    !!error &&
    /relation .*equipment.* does not exist|Could not find the table/i.test(
      error.message || ""
    );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">재고 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        운영하는 기기를 한 대씩 등록합니다. (예: 가챠머신1, 가챠머신2, 스탑워치1)
        여기 등록된 기기로 행사 일정에서 스케줄을 배정하고, 견적 확정 시 가용
        재고를 확인합니다.
      </p>

      {tableMissing ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">재고 테이블이 아직 없습니다.</p>
          <p className="mt-1">
            Supabase → SQL Editor 에서 아래 SQL을 한 번 실행한 뒤 새로고침해주세요.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink/90 p-3 text-xs leading-relaxed text-white">{`create table if not exists equipment (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text,
  active boolean default true,
  memo text,
  created_at timestamptz default now()
);
alter table equipment enable row level security;
create index if not exists idx_equipment_category on equipment (category);`}</pre>
        </div>
      ) : (
        <div className="mt-6">
          <InventoryManager
            equipment={equipment ?? []}
            categories={(categories ?? []).map((c) => c.name)}
          />
        </div>
      )}
    </div>
  );
}
