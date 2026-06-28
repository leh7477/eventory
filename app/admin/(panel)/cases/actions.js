"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { processAndUpload } from "@/lib/admin/storage";

function rv() {
  revalidatePath("/admin/cases");
  revalidatePath("/cases");
  revalidatePath("/");
}

export async function createCase(formData) {
  await requireAdmin();
  const title = formData.get("title")?.toString().trim();
  const categoryId = formData.get("category_id")?.toString() || null;
  const description = formData.get("description")?.toString().trim() || null;
  const tagsRaw = formData.get("tags")?.toString().trim() || "";
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : null;
  const files = formData
    .getAll("images")
    .filter((f) => f && typeof f !== "string" && f.size > 0);

  if (!title) return { error: "제목(장비명)을 입력하세요." };
  if (files.length === 0) return { error: "사진을 1장 이상 선택하세요." };

  try {
    const admin = createAdminClient();
    const urls = [];
    for (const f of files) {
      const { url } = await processAndUpload(f, "cases");
      urls.push(url);
    }

    const { data: top } = await admin
      .from("cases")
      .select("order_num")
      .order("order_num", { ascending: false })
      .limit(1)
      .maybeSingle();
    const order_num = (top?.order_num ?? 0) + 1;

    const { data: row, error } = await admin
      .from("cases")
      .insert({ title, category_id: categoryId || null, description, tags, image_url: urls[0], order_num })
      .select()
      .single();
    if (error) return { error: error.message };

    const imgRows = urls.map((url, i) => ({
      case_id: row.id,
      image_url: url,
      order_num: i,
    }));
    const { error: e2 } = await admin.from("case_images").insert(imgRows);
    if (e2) return { error: "이미지 저장 실패: " + e2.message };

    rv();
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function deleteCase(id) {
  await requireAdmin();
  const admin = createAdminClient();
  // case_images 는 FK on delete cascade 로 자동 삭제됨
  const { error } = await admin.from("cases").delete().eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function swapCaseOrder(a, b) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("cases").update({ order_num: b.order_num }).eq("id", a.id);
  await admin.from("cases").update({ order_num: a.order_num }).eq("id", b.id);
  rv();
  return { ok: true };
}
