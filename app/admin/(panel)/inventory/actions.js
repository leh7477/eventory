"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidate() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/schedule");
}

// 테이블 미생성 안내
function friendly(error) {
  if (error?.message && /relation .*equipment.* does not exist|Could not find the table/i.test(error.message)) {
    return { error: "재고(equipment) 테이블이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
  }
  return { error: error.message };
}

export async function createEquipment({ name, category } = {}) {
  await requireSection("inventory");
  const nm = (name ?? "").trim();
  if (!nm) return { error: "기기 이름을 입력하세요." };
  const admin = createAdminClient();
  const { error } = await admin.from("equipment").insert({
    name: nm,
    category: (category ?? "").trim() || null,
    active: true,
  });
  if (error) return friendly(error);
  revalidate();
  return { ok: true };
}

// 종류 이름 + 수량 → 번호 매긴 기기 자동 생성 (예: 가챠머신 × 7 → 가챠머신1~7)
// 이미 있는 번호는 건너뛰고, 부족한 만큼만 채움(수량 늘리기에도 사용)
export async function createEquipmentBulk({ category, count } = {}) {
  await requireSection("inventory");
  const cat = (category ?? "").trim();
  const n = parseInt(count, 10);
  if (!cat) return { error: "종류 이름을 입력하세요." };
  if (!Number.isFinite(n) || n < 1) return { error: "수량을 1 이상으로 입력하세요." };
  if (n > 100) return { error: "한 번에 최대 100대까지 생성할 수 있습니다." };

  const admin = createAdminClient();
  const { data: existing, error: selErr } = await admin
    .from("equipment")
    .select("name")
    .eq("category", cat);
  if (selErr) return friendly(selErr);

  const have = new Set((existing ?? []).map((e) => e.name));
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const name = `${cat}${i}`;
    if (!have.has(name)) rows.push({ name, category: cat, active: true });
  }
  if (rows.length === 0) return { ok: true, created: 0 };

  const { error } = await admin.from("equipment").insert(rows);
  if (error) return friendly(error);
  revalidate();
  return { ok: true, created: rows.length };
}

// 해당 종류에 다음 번호 기기 1대 추가 (예: 가챠머신 → 가챠머신8)
export async function addNextUnit({ category } = {}) {
  await requireSection("inventory");
  const cat = (category ?? "").trim();
  if (!cat) return { error: "종류 이름이 없습니다." };
  const admin = createAdminClient();
  const { data: rows, error: selErr } = await admin
    .from("equipment")
    .select("name")
    .eq("category", cat);
  if (selErr) return friendly(selErr);

  // 이름 뒤 숫자 중 최댓값 +1
  let max = 0;
  for (const r of rows ?? []) {
    const m = String(r.name).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const name = `${cat}${max + 1}`;
  const { error } = await admin.from("equipment").insert({ name, category: cat, active: true });
  if (error) return friendly(error);
  revalidate();
  return { ok: true };
}

export async function updateEquipment(id, { name, category, memo } = {}) {
  await requireSection("inventory");
  const nm = (name ?? "").trim();
  if (!nm) return { error: "기기 이름을 입력하세요." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("equipment")
    .update({
      name: nm,
      category: (category ?? "").trim() || null,
      memo: (memo ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return friendly(error);
  revalidate();
  return { ok: true };
}

// 운영(재고 포함) 여부 토글
export async function setEquipmentActive(id, active) {
  await requireSection("inventory");
  const admin = createAdminClient();
  const { error } = await admin.from("equipment").update({ active: !!active }).eq("id", id);
  if (error) return friendly(error);
  revalidate();
  return { ok: true };
}

export async function deleteEquipment(id) {
  await requireSection("inventory");
  const admin = createAdminClient();
  const { error } = await admin.from("equipment").delete().eq("id", id);
  if (error) return friendly(error);
  revalidate();
  return { ok: true };
}
