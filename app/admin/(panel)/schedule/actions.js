"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function rv() {
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/inquiries");
}

export async function createSchedule({ title, start_date, end_date, start_time, end_time, location, memo }) {
  await requireAdmin();
  if (!title?.trim()) return { error: "일정 제목을 입력하세요." };
  if (!start_date) return { error: "시작일을 선택하세요." };
  const admin = createAdminClient();
  const { error } = await admin.from("schedules").insert({
    title: title.trim(),
    start_date,
    end_date: end_date || start_date,
    start_time: start_time || null,
    end_time: end_time || null,
    location: location?.trim() || null,
    memo: memo?.trim() || null,
  });
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 일정 시간(시작/종료) 수정 — 연동 일정 포함 추후 입력용
export async function updateScheduleTime(id, start_time, end_time) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedules")
    .update({ start_time: start_time || null, end_time: end_time || null })
    .eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 견적 문의 → 행사 픽스 시 일정 자동 등록
export async function createScheduleFromInquiry(inquiryId) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("inquiries")
    .select("*")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!q) return { error: "문의를 찾을 수 없습니다." };
  if (!q.event_start) return { error: "이 문의에는 행사 시작일이 없습니다." };

  // 같은 문의로 이미 등록된 일정이 있으면 중복 방지
  const { data: dup } = await admin
    .from("schedules")
    .select("id")
    .eq("inquiry_id", inquiryId)
    .maybeSingle();
  if (dup) return { error: "이미 이 문의로 등록된 일정이 있습니다." };

  const title = [q.company_name || q.name || "행사", q.product]
    .filter(Boolean)
    .join(" · ");
  const location = [q.address, q.address_detail].filter(Boolean).join(" ") || null;

  const { error } = await admin.from("schedules").insert({
    title,
    start_date: q.event_start,
    end_date: q.event_end || q.event_start,
    location,
    memo: [q.usage ? `용도: ${q.usage}` : null, q.contact_name ? `담당: ${q.contact_name} (${q.phone ?? "-"})` : null]
      .filter(Boolean)
      .join("\n") || null,
    inquiry_id: inquiryId,
  });
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function deleteSchedule(id) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("schedules").delete().eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}
