"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// 정산 정보 저장 (계산서 발행일 / 입금일 / 실입금액)
export async function updateSettlement(id, { invoice_date, paid_date, paid_amount } = {}) {
  await requireAdmin();
  const admin = createAdminClient();
  const digits = String(paid_amount ?? "").replace(/\D/g, "");
  const { error } = await admin
    .from("inquiries")
    .update({
      invoice_date: invoice_date || null,
      paid_date: paid_date || null,
      paid_amount: digits === "" ? null : parseInt(digits, 10),
    })
    .eq("id", id);
  if (error) {
    if (/invoice_date|paid_date|paid_amount|column/i.test(error.message)) {
      return { error: "정산 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }
  revalidatePath("/admin/stats");
  return { ok: true };
}
