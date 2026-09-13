import { createAdminClient } from "@/lib/supabase/admin";
import SalesTabs from "@/components/admin/SalesTabs";
import ShippingRateManager from "@/components/admin/ShippingRateManager";
import RentalRateManager from "@/components/admin/RentalRateManager";
import MadeRateManager from "@/components/admin/MadeRateManager";

export const revalidate = 0;

export default async function RatesPage() {
  const admin = createAdminClient();

  const [shipRes, rentRes, catRes] = await Promise.all([
    admin.from("shipping_rates").select("*").order("sort", { ascending: true }),
    admin.from("rental_rates").select("*").order("sort", { ascending: true }),
    admin.from("categories").select("name").order("order_num", { ascending: true }),
  ]);

  const tableMissing =
    /relation|does not exist|schema cache/i.test(shipRes.error?.message || "") ||
    /relation|does not exist|schema cache/i.test(rentRes.error?.message || "");

  const shipping = shipRes.data ?? [];
  const rental = rentRes.data ?? [];
  const categories = (catRes.data ?? []).map((c) => c.name);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-ink">단가 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        지역별 배송료와 제품별 대여 단가를 관리합니다. 견적서 작성 시 지역·일수에 맞춰
        자동으로 금액이 채워집니다.
      </p>

      {tableMissing ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-700">
          단가 테이블이 아직 없습니다. 안내된 SQL을 Supabase에서 먼저 실행해주세요.
        </p>
      ) : (
        <div className="mt-5">
          <SalesTabs tabs={["대여 단가", "제작 단가", "배송료"]} initial={0}>
            <RentalRateManager rows={rental} categories={categories} />
            <MadeRateManager rows={rental} categories={categories} />
            <ShippingRateManager rows={shipping} />
          </SalesTabs>
        </div>
      )}
    </div>
  );
}
