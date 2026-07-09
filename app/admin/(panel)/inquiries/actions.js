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

// 활동 로그 추가 (best-effort — 컬럼 없어도 본 동작은 막지 않음)
async function appendActivityLog(admin, id, by, action) {
  const { data } = await admin
    .from("inquiries")
    .select("activity_log")
    .eq("id", id)
    .maybeSingle();
  const log = Array.isArray(data?.activity_log) ? data.activity_log : [];
  log.push({ at: new Date().toISOString(), by, action });
  await admin.from("inquiries").update({ activity_log: log }).eq("id", id);
}

// 문의 내용 수정 (고객 오입력 정정용) — 어떤 항목을 수정했는지 로그 기록
export async function updateInquiry(id, fields) {
  const user = await requireAdmin();
  const admin = createAdminClient();

  const { data: cur } = await admin
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!cur) return { error: "문의를 찾을 수 없습니다." };

  const allowed = [
    "company_name",
    "contact_name",
    "phone",
    "email",
    "product",
    "usage",
    "event_start",
    "event_end",
    "address",
    "address_detail",
    "message",
  ];
  const update = {};
  const changed = new Set();
  allowed.forEach((k) => {
    if (k in fields) {
      const raw = typeof fields[k] === "string" ? fields[k].trim() : fields[k];
      const v = raw === "" ? null : raw;
      update[k] = v;
      if ((cur[k] ?? null) !== (v ?? null)) changed.add(k);
    }
  });

  const { error } = await admin.from("inquiries").update(update).eq("id", id);
  if (error) return { error: "수정에 실패했습니다. 잠시 후 다시 시도해주세요." };

  // 변경된 항목 라벨 → 로그
  const labels = [];
  if (changed.has("event_start") || changed.has("event_end")) labels.push("행사 기간");
  if (changed.has("address") || changed.has("address_detail")) labels.push("장소");
  [
    ["company_name", "업체명"],
    ["contact_name", "담당자명"],
    ["phone", "연락처"],
    ["email", "이메일"],
    ["product", "문의 제품"],
    ["usage", "제품 용도"],
    ["message", "기타 문의"],
  ].forEach(([k, l]) => changed.has(k) && labels.push(l));

  if (labels.length > 0) {
    const who = (user.email || "").replace(/@.*/, "");
    await appendActivityLog(admin, id, who, `${labels.join(", ")} 수정`);
  }

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
