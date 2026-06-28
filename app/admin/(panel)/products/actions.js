"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAndUpload } from "@/lib/admin/storage";
import { getYouTubeId } from "@/lib/youtube";

function rv() {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
}

export async function createProduct(formData) {
  await requireAdmin();
  const name = formData.get("name")?.toString().trim();
  const categoryId = formData.get("category_id")?.toString() || null;
  const description = formData.get("description")?.toString().trim() || null;
  const specs = formData.get("specs")?.toString().trim() || null;
  const videoUrlRaw = formData.get("video_url")?.toString().trim() || "";
  const files = formData
    .getAll("images")
    .filter((f) => f && typeof f !== "string" && f.size > 0);

  if (!name) return { error: "제품명을 입력하세요." };
  if (files.length === 0) return { error: "사진을 1장 이상 선택하세요." };

  let video_url = null;
  if (videoUrlRaw) {
    if (!getYouTubeId(videoUrlRaw))
      return { error: "유효한 유튜브 URL이 아닙니다. (쇼츠/일반 영상 링크)" };
    video_url = videoUrlRaw;
  }

  try {
    const admin = createAdminClient();
    const urls = [];
    for (const f of files) {
      const { url } = await processAndUpload(f, "products");
      urls.push(url);
    }

    const { data: top } = await admin
      .from("products")
      .select("order_num")
      .order("order_num", { ascending: false })
      .limit(1)
      .maybeSingle();
    const order_num = (top?.order_num ?? 0) + 1;

    const { data: row, error } = await admin
      .from("products")
      .insert({
        category_id: categoryId || null,
        name,
        description,
        specs,
        video_url,
        is_active: true,
        order_num,
      })
      .select()
      .single();
    if (error) return { error: error.message };

    const imgRows = urls.map((url, i) => ({
      product_id: row.id,
      image_url: url,
      order_num: i,
    }));
    const { error: e2 } = await admin.from("product_images").insert(imgRows);
    if (e2) return { error: "이미지 저장 실패: " + e2.message };

    rv();
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function toggleProduct(id, isActive) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("products").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function deleteProduct(id) {
  await requireAdmin();
  const admin = createAdminClient();
  // product_images 는 FK on delete cascade 로 자동 삭제됨
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function swapProductOrder(a, b) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("products").update({ order_num: b.order_num }).eq("id", a.id);
  await admin.from("products").update({ order_num: a.order_num }).eq("id", b.id);
  rv();
  return { ok: true };
}
