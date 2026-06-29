"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidate() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/cases");
  revalidatePath("/products");
  revalidatePath("/");
}

// 카테고리 기본 스펙 저장 (Stories 등록 시 기본값으로 사용)
export async function updateCategorySpecs(id, specsText) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("categories")
    .update({ default_specs: specsText || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function createCategory(name) {
  await requireAdmin();
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { error: "이름을 입력하세요." };
  const admin = createAdminClient();
  const { data: top } = await admin
    .from("categories")
    .select("order_num")
    .order("order_num", { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_num = (top?.order_num ?? 0) + 1;
  const { error } = await admin.from("categories").insert({ name: trimmed, order_num });
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function updateCategory(id, name) {
  await requireAdmin();
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { error: "이름을 입력하세요." };
  const admin = createAdminClient();
  const { error } = await admin.from("categories").update({ name: trimmed }).eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

export async function deleteCategory(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { ok: true };
}

// 두 카테고리의 order_num 교환 (순서 위/아래 이동)
export async function swapCategoryOrder(a, b) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("categories").update({ order_num: b.order_num }).eq("id", a.id);
  await admin.from("categories").update({ order_num: a.order_num }).eq("id", b.id);
  revalidate();
  return { ok: true };
}
