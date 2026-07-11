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
  if (!start_date) return { error: "설치 날짜를 선택하세요." };
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

// 설치/회수 일시 수정 (날짜+시간) — 전날 설치 등 대응
export async function updateScheduleDatetime(id, { start_date, end_date, start_time, end_time }) {
  await requireAdmin();
  if (!start_date) return { error: "설치 날짜를 선택하세요." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedules")
    .update({
      start_date,
      end_date: end_date || start_date,
      start_time: start_time || null,
      end_time: end_time || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 견적 문의 → 행사 픽스 시 일정 자동 등록
// opts: 설치/회수 일시 { start_date, end_date, start_time, end_time } (날짜 미지정 시 행사 기간 사용)
export async function createScheduleFromInquiry(inquiryId, opts = {}) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("inquiries")
    .select("*")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!q) return { error: "문의를 찾을 수 없습니다." };
  if (!q.handled)
    return {
      error: "회신이 완료되지 않은 문의입니다. 먼저 '회신 완료 처리' 후 일정을 등록해주세요.",
    };
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

  const start_date = opts?.start_date || q.event_start;
  const end_date = opts?.end_date || q.event_end || q.event_start;

  const { error } = await admin.from("schedules").insert({
    title,
    start_date,
    end_date,
    start_time: opts?.start_time || null,
    end_time: opts?.end_time || null,
    location,
    memo: [q.usage ? `용도: ${q.usage}` : null, q.contact_name ? `담당: ${q.contact_name} (${q.phone ?? "-"})` : null]
      .filter(Boolean)
      .join("\n") || null,
    inquiry_id: inquiryId,
  });
  if (error) return { error: error.message };

  // 활동 로그 기록 (best-effort)
  const who = (user.email || "").replace(/@.*/, "");
  const { data: cur } = await admin
    .from("inquiries")
    .select("activity_log")
    .eq("id", inquiryId)
    .maybeSingle();
  const log = Array.isArray(cur?.activity_log) ? cur.activity_log : [];
  log.push({ at: new Date().toISOString(), by: who, action: "일정 등록" });
  await admin.from("inquiries").update({ activity_log: log }).eq("id", inquiryId);

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
