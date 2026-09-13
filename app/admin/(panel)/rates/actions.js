"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const toInt = (v) => {
  const digits = String(v ?? "").replace(/\D/g, "");
  return digits === "" ? null : parseInt(digits, 10);
};

const missingTable = (msg) =>
  /relation|does not exist|schema cache|column|shipping_rates|rental_rates/i.test(
    msg || ""
  );

// ---- 배송료 단가 ----
export async function saveShippingRate(row) {
  await requireAdmin();
  const admin = createAdminClient();
  const region = String(row.region ?? "").trim();
  if (!region) return { error: "지역명을 입력하세요." };

  const payload = {
    region,
    quick_fee: toInt(row.quick_fee),
    direct_fee: toInt(row.direct_fee),
  };

  let error;
  if (row.id) {
    ({ error } = await admin.from("shipping_rates").update(payload).eq("id", row.id));
  } else {
    ({ error } = await admin.from("shipping_rates").insert(payload));
  }
  if (error) {
    if (/duplicate|unique/i.test(error.message))
      return { error: "이미 등록된 지역입니다." };
    if (missingTable(error.message))
      return { error: "단가 테이블이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    return { error: error.message };
  }
  revalidatePath("/admin/rates");
  return { ok: true };
}

export async function deleteShippingRate(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("shipping_rates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/rates");
  return { ok: true };
}

// ---- 대여 단가 ----
export async function saveRentalRate(row) {
  await requireAdmin();
  const admin = createAdminClient();
  const product = String(row.product ?? "").trim();
  if (!product) return { error: "제품명을 입력하세요." };

  // prices: 길이 14 배열, 각 칸 정수 또는 null
  const prices = Array.from({ length: 14 }, (_, i) => toInt(row.prices?.[i]));

  const payload = { product, prices };

  let error;
  if (row.id) {
    ({ error } = await admin.from("rental_rates").update(payload).eq("id", row.id));
  } else {
    ({ error } = await admin.from("rental_rates").insert(payload));
  }
  if (error) {
    if (/duplicate|unique/i.test(error.message))
      return { error: "이미 등록된 제품입니다." };
    if (missingTable(error.message))
      return { error: "단가 테이블이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    return { error: error.message };
  }
  revalidatePath("/admin/rates");
  return { ok: true };
}

export async function deleteRentalRate(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("rental_rates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/rates");
  return { ok: true };
}

// ---- 제작 단가 (rental_rates.made_price, 카테고리별 1칸) ----
export async function saveMadeRate(product, price) {
  await requireAdmin();
  const admin = createAdminClient();
  const p = String(product ?? "").trim();
  if (!p) return { error: "제품명을 입력하세요." };

  const { error } = await admin
    .from("rental_rates")
    .upsert({ product: p, made_price: toInt(price) }, { onConflict: "product" });
  if (error) {
    if (/made_price|column/i.test(error.message))
      return { error: "제작 단가 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    if (missingTable(error.message))
      return { error: "단가 테이블이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    return { error: error.message };
  }
  revalidatePath("/admin/rates");
  return { ok: true };
}
