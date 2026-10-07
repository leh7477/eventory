"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActor } from "@/lib/admin/sections";
import { writeAudit } from "@/lib/admin/audit";
import { saveSettlement, syncPaidTotal } from "@/lib/admin/settlements";

// 정산 정보 저장 — 전달된 필드만 업데이트 + 처리 직원·시각 기록
//
// 실제 저장 로직은 lib/admin/settlements.js 가 담당한다.
// 정산을 별도 표(settlements)로 옮기는 중이라, 새 표와 기존 컬럼 양쪽에 쓴다.
// (표가 아직 없으면 기존 컬럼에만 쓰고 정상 동작한다)
export async function updateSettlement(id, fields = {}) {
  const user = await requireSection("stats");
  const admin = createAdminClient();

  const res = await saveSettlement(admin, id, fields, logActor(user));
  if (res?.error) return res;

  // 금액을 다루는 화면이라 변경 이력을 남긴다
  await writeAudit({
    user,
    section: "stats",
    action: "update",
    table: "settlements",
    id,
    detail: fields,
  });

  revalidatePath("/admin/stats");
  return { ok: true };
}

// 입금 한 건 추가 — 계약금·잔금처럼 나눠 받는 경우를 위해 건별로 쌓는다.
export async function addPayment(inquiryId, { paid_date, amount, memo } = {}) {
  const user = await requireSection("stats");
  const admin = createAdminClient();

  const date = String(paid_date || "").trim();
  const won = parseInt(String(amount ?? "").replace(/\D/g, ""), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "입금일을 선택해주세요." };
  if (!Number.isFinite(won) || won <= 0) return { error: "입금액을 입력해주세요." };

  const { error } = await admin.from("payments").insert({
    inquiry_id: inquiryId,
    paid_date: date,
    amount: won,
    memo: (memo ?? "").trim() || null,
    created_by: logActor(user),
  });
  if (error) {
    if (/payments|relation|column/i.test(error.message)) {
      return { error: "입금 내역(payments) 표가 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }

  const sync = await syncPaidTotal(admin, inquiryId);
  if (sync?.error) return sync;

  await writeAudit({
    user, section: "stats", action: "create", table: "payments",
    id: inquiryId, detail: { paid_date: date, amount: won, memo },
  });

  revalidatePath("/admin/stats");
  return { ok: true };
}

// 입금 한 건 삭제 (잘못 넣었을 때)
export async function deletePayment(paymentId) {
  const user = await requireSection("stats");
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("payments")
    .select("inquiry_id, paid_date, amount")
    .eq("id", paymentId)
    .maybeSingle();
  if (!row) return { error: "이미 삭제된 입금입니다." };

  const { error } = await admin.from("payments").delete().eq("id", paymentId);
  if (error) return { error: error.message };

  const sync = await syncPaidTotal(admin, row.inquiry_id);
  if (sync?.error) return sync;

  await writeAudit({
    user, section: "stats", action: "delete", table: "payments",
    id: row.inquiry_id, detail: { paid_date: row.paid_date, amount: row.amount },
  });

  revalidatePath("/admin/stats");
  return { ok: true };
}
