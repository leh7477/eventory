"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
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
  await requireAdmin();
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

export async function updateEquipment(id, { name, category, memo } = {}) {
  await requireAdmin();
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
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("equipment").update({ active: !!active }).eq("id", id);
  if (error) return friendly(error);
  revalidate();
  return { ok: true };
}

export async function deleteEquipment(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("equipment").delete().eq("id", id);
  if (error) return friendly(error);
  revalidate();
  return { ok: true };
}
