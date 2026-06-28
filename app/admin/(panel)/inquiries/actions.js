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

export async function deleteInquiry(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("inquiries").delete().eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}
