"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// 정산 정보 저장 — 전달된 필드만 업데이트 (다른 항목 건드리지 않음)
export async function updateSettlement(id, fields = {}) {
  await requireAdmin();
  const admin = createAdminClient();
  const update = {};
  if ("invoice_date" in fields) update.invoice_date = fields.invoice_date || null;
  if ("paid_date" in fields) update.paid_date = fields.paid_date || null;
  if ("paid_amount" in fields) {
    const digits = String(fields.paid_amount ?? "").replace(/\D/g, "");
    update.paid_amount = digits === "" ? null : parseInt(digits, 10);
  }
  if (Object.keys(update).length === 0) return { ok: true };
  const { error } = await admin.from("inquiries").update(update).eq("id", id);
  if (error) {
    if (/invoice_date|paid_date|paid_amount|column/i.test(error.message)) {
      return { error: "정산 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }
  revalidatePath("/admin/stats");
  return { ok: true };
}
