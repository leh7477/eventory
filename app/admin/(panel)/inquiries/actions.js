"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function rv() {
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/dashboard");
}

export async function setInquiryRead(id, isRead) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("inquiries").update({ is_read: isRead }).eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 회신 완료 처리 (담당자·시각 기록). 취소 시 비움.
export async function setInquiryHandled(id, handled) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const who = (user.email || "").replace(/@.*/, "");
  const update = handled
    ? {
        handled: true,
        handled_by: who,
        handled_at: new Date().toISOString(),
        is_read: true,
      }
    : { handled: false, handled_by: null, handled_at: null };
  const { error } = await admin.from("inquiries").update(update).eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function deleteInquiry(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("inquiries").delete().eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}
