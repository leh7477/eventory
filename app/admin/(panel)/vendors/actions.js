"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
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
  const user = await requireSection("vendors");
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
  await writeAudit({ user, section: "vendors", action: "create", table: "vendors", detail: { name: nm } });
  rv();
  return { ok: true };
}

export async function updateVendor(id, { name, contact, phone, memo } = {}) {
  const user = await requireSection("vendors");
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
  await writeAudit({ user, section: "vendors", action: "update", table: "vendors", id, detail: { name: nm } });
  rv();
  return { ok: true };
}

export async function deleteVendor(id) {
  const user = await requireSection("vendors");
  const admin = createAdminClient();
  // 지워지고 나면 이름을 알 수 없으므로 미리 확보해 기록에 남긴다
  const { data: before } = await admin.from("vendors").select("name").eq("id", id).maybeSingle();
  const { error } = await admin.from("vendors").delete().eq("id", id);
  if (error) return friendly(error);
  await writeAudit({ user, section: "vendors", action: "delete", table: "vendors", id, detail: { name: before?.name ?? null } });
  rv();
  return { ok: true };
}
