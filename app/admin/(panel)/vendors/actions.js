"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function rv() {
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/schedule");
}

function friendly(error) {
  if (error?.message && /vendors|does not exist|Could not find the table/i.test(error.message)) {
    return { error: "거래처(vendors) 테이블이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
  }
  return { error: error.message };
}

const clean = (v) => ((v ?? "").trim() ? v.trim() : null);

export async function createVendor({ name, contact, phone, memo } = {}) {
  await requireAdmin();
  const nm = (name ?? "").trim();
  if (!nm) return { error: "거래처 이름을 입력하세요." };
  const admin = createAdminClient();
  const { error } = await admin.from("vendors").insert({
    name: nm,
    contact: clean(contact),
    phone: clean(phone),
    memo: clean(memo),
  });
  if (error) return friendly(error);
  rv();
  return { ok: true };
}

export async function updateVendor(id, { name, contact, phone, memo } = {}) {
  await requireAdmin();
  const nm = (name ?? "").trim();
  if (!nm) return { error: "거래처 이름을 입력하세요." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .update({
      name: nm,
      contact: clean(contact),
      phone: clean(phone),
      memo: clean(memo),
    })
    .eq("id", id);
  if (error) return friendly(error);
  rv();
  return { ok: true };
}

export async function deleteVendor(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("vendors").delete().eq("id", id);
  if (error) return friendly(error);
  rv();
  return { ok: true };
}
