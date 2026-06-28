"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAndUpload } from "@/lib/admin/storage";

function rv() {
  revalidatePath("/admin/banner");
  revalidatePath("/");
}

export async function createBanner(formData) {
  await requireAdmin();
  const file = formData.get("image");
  const title = formData.get("title")?.toString().trim() || null;
  const subtitle = formData.get("subtitle")?.toString().trim() || null;

  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "이미지를 선택하세요." };
  }

  try {
    const { url } = await processAndUpload(file, "banners");
    const admin = createAdminClient();
    const { data: top } = await admin
      .from("banners")
      .select("order_num")
      .order("order_num", { ascending: false })
      .limit(1)
      .maybeSingle();
    const order_num = (top?.order_num ?? 0) + 1;
    const { error } = await admin
      .from("banners")
      .insert({ image_url: url, title, subtitle, order_num, is_active: true });
    if (error) return { error: error.message };
    rv();
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function toggleBanner(id, isActive) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("banners").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function deleteBanner(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("banners").delete().eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function swapBannerOrder(a, b) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("banners").update({ order_num: b.order_num }).eq("id", a.id);
  await admin.from("banners").update({ order_num: a.order_num }).eq("id", b.id);
  rv();
  return { ok: true };
}
