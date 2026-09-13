"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActor } from "@/lib/admin/sections";

// 정산 정보 저장 — 전달된 필드만 업데이트 + 처리 직원·시각 기록
export async function updateSettlement(id, fields = {}) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const actor = logActor(user);
  const nowIso = new Date().toISOString();

  const update = {};
  const stamps = {}; // 처리자·시각 (컬럼 없으면 생략 재시도)
  if ("invoice_date" in fields) {
    update.invoice_date = fields.invoice_date || null;
    if (fields.invoice_date) {
      stamps.invoice_by = actor;
      stamps.invoice_at = nowIso;
    } else {
      stamps.invoice_by = null;
      stamps.invoice_at = null;
    }
  }
  if ("paid_amount" in fields) {
    const digits = String(fields.paid_amount ?? "").replace(/\D/g, "");
    update.paid_amount = digits === "" ? null : parseInt(digits, 10);
  }
  if ("paid_date" in fields) {
    update.paid_date = fields.paid_date || null;
    if (fields.paid_date) {
      stamps.paid_by = actor;
      stamps.paid_at = nowIso;
    } else {
      stamps.paid_by = null;
      stamps.paid_at = null;
    }
  }
  if (Object.keys(update).length === 0 && Object.keys(stamps).length === 0)
    return { ok: true };

  // 1차: 처리자·시각 포함
  let { error } = await admin
    .from("inquiries")
    .update({ ...update, ...stamps })
    .eq("id", id);
  // 처리자·시각 컬럼이 아직 없으면 그것만 빼고 재시도 (핵심 날짜는 저장)
  if (error && /invoice_by|invoice_at|paid_by|paid_at/i.test(error.message)) {
    ({ error } = await admin.from("inquiries").update(update).eq("id", id));
  }
  if (error) {
    if (/invoice_date|paid_date|paid_amount|column/i.test(error.message)) {
      return { error: "정산 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }
  revalidatePath("/admin/stats");
  return { ok: true };
}
