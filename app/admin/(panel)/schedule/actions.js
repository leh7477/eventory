"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { availableFor } from "@/lib/inventory";
import { logActor } from "@/lib/admin/sections";

function rv() {
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/inquiries");
}

export async function createSchedule({
  title,
  event_start,
  event_end,
  start_date,
  end_date,
  start_time,
  end_time,
  location,
  memo,
}) {
  await requireAdmin();
  if (!title?.trim()) return { error: "일정 제목을 입력하세요." };
  if (!start_date) return { error: "납품 날짜를 선택하세요." };
  const admin = createAdminClient();
  const { error } = await admin.from("schedules").insert({
    title: title.trim(),
    event_start: event_start || null,
    event_end: event_end || event_start || null,
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

// 행사 외(업무) 일정 추가 — 날짜 + 시간 + 업무 내용만
export async function createTask({ date, start_time, end_time, title, memo }) {
  await requireAdmin();
  if (!title?.trim()) return { error: "업무 내용을 입력하세요." };
  if (!date) return { error: "날짜를 선택하세요." };
  const admin = createAdminClient();
  const { error } = await admin.from("schedules").insert({
    kind: "task",
    title: title.trim(),
    start_date: date,
    end_date: date,
    start_time: start_time || null,
    end_time: end_time || null,
    memo: memo?.trim() || null,
  });
  if (error) {
    if (/kind/.test(error.message)) {
      return { error: "일정 종류(kind) 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }
  rv();
  return { ok: true };
}

// 행사 외 일정 수정 (날짜/시간/내용)
export async function updateTask(id, { date, start_time, end_time, title, memo }) {
  await requireAdmin();
  if (!title?.trim()) return { error: "업무 내용을 입력하세요." };
  if (!date) return { error: "날짜를 선택하세요." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedules")
    .update({
      title: title.trim(),
      start_date: date,
      end_date: date,
      start_time: start_time || null,
      end_time: end_time || null,
      memo: memo?.trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 행사 기간 + 납품/회수 일시 수정 — 전날 납품 등 대응
export async function updateScheduleDatetime(
  id,
  { event_start, event_end, start_date, end_date, start_time, end_time }
) {
  await requireAdmin();
  if (!start_date) return { error: "납품 날짜를 선택하세요." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedules")
    .update({
      event_start: event_start || null,
      event_end: event_end || event_start || null,
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
// opts: 납품/회수 일시 { start_date, end_date, start_time, end_time } (날짜 미지정 시 행사 기간 사용)
export async function createScheduleFromInquiry(inquiryId, opts = {}) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("inquiries")
    .select("*")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!q) return { error: "문의를 찾을 수 없습니다." };
  const okStatus =
    q.status === "confirmed" || q.status === "done" || (!q.status && q.handled);
  if (!okStatus)
    return {
      error: "'계약확정' 상태의 문의만 일정에 등록할 수 있습니다. 상세에서 상태를 변경 후 등록해주세요.",
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

  // 제작은 회수가 없는 '납품 일정만' — 종료일·회수시간 없음, 기기 배정 없음
  const isMade = q.usage === "제작";
  const start_date = opts?.start_date || q.event_start;
  const end_date = isMade ? start_date : opts?.end_date || q.event_end || q.event_start;

  const { data: newSched, error } = await admin
    .from("schedules")
    .insert({
      title,
      event_start: q.event_start,
      event_end: q.event_end || q.event_start,
      start_date,
      end_date,
      start_time: opts?.start_time || null,
      end_time: isMade ? null : opts?.end_time || null,
      location,
      client_manager: q.contact_name || q.name || null,
      client_phone: q.phone || null,
      memo: q.usage ? `용도: ${q.usage}` : null, // 용도 배지는 memo에서 읽음(usageOf)
      inquiry_id: inquiryId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // 기기 배정(선택) — 일정 생성과 함께 재고 배정 + 가용 검증 (제작은 재고 무관 → 배정 안 함)
  const eq = isMade ? null : opts?.equipment;
  if (eq?.category && Number(eq.quantity) > 0 && newSched?.id) {
    const r = await setScheduleItem(newSched.id, eq.category, eq.quantity);
    if (r?.error) {
      // 배정 실패해도 일정은 생성됨 — 경고만 반환
      rv();
      return { ok: true, warning: `일정은 등록됐지만 기기 배정 실패: ${r.error}` };
    }
  }

  // 활동 로그 기록 (best-effort)
  const who = logActor(user);
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

// 거래처(발주처) 추가
export async function createVendor(name) {
  await requireAdmin();
  const nm = (name ?? "").trim();
  if (!nm) return { error: "거래처 이름을 입력하세요." };
  const admin = createAdminClient();
  const { data, error } = await admin.from("vendors").insert({ name: nm }).select().single();
  if (error) {
    if (/vendors|does not exist|Could not find the table/i.test(error.message)) {
      return { error: "거래처(vendors) 테이블이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }
  rv();
  return { ok: true, vendor: data };
}

// 일정의 발주처 지정 (schedule.vendor에 저장)
export async function setScheduleVendor(id, vendor) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedules")
    .update({ vendor: (vendor ?? "").trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 행사 일정 진행 단계 설정 (0~4) — 단계별 체크 시각 기록
export async function setScheduleStage(id, stage) {
  const user = await requireAdmin();
  const n = parseInt(stage, 10);
  if (!Number.isFinite(n) || n < 0 || n > 4) return { error: "단계 값이 올바르지 않습니다." };
  const admin = createAdminClient();
  const actor = logActor(user);

  // 기존 체크 시각·처리자 유지 + 새로 도달한 단계 기록, n 초과 단계는 제거
  const { data: cur } = await admin
    .from("schedules")
    .select("stage_dates, stage_by, vendor")
    .eq("id", id)
    .maybeSingle();
  const prev = cur && typeof cur.stage_dates === "object" && cur.stage_dates ? cur.stage_dates : {};
  const prevBy = cur && typeof cur.stage_by === "object" && cur.stage_by ? cur.stage_by : {};
  const nowIso = new Date().toISOString();
  const dates = {};
  const by = {};
  for (let i = 1; i <= n; i++) {
    dates[String(i)] = prev[String(i)] || nowIso;
    by[String(i)] = prevBy[String(i)] || actor;
  }

  let { error } = await admin
    .from("schedules")
    .update({ stage: n, stage_dates: dates, stage_by: by })
    .eq("id", id);
  // stage_by 컬럼이 아직 없으면 그것만 빼고 재시도
  if (error && /stage_by/i.test(error.message)) {
    ({ error } = await admin
      .from("schedules")
      .update({ stage: n, stage_dates: dates })
      .eq("id", id));
  }
  // stage_dates 컬럼이 아직 없으면 단계만 저장 (시각은 SQL 실행 후 기록)
  if (error && /stage_dates/i.test(error.message)) {
    ({ error } = await admin.from("schedules").update({ stage: n }).eq("id", id));
  }
  if (error) {
    if (/stage|column/i.test(error.message)) {
      return { error: "진행 단계(stage) 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }

  // 출력물 발주(1단계) 도달 & 발주처 미지정 → 최근 쓴 발주처 자동 지정 (변경 가능)
  if (n >= 1 && !cur?.vendor) {
    const { data: recent } = await admin
      .from("schedules")
      .select("vendor")
      .neq("id", id)
      .not("vendor", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);
    const lastVendor = (recent ?? [])
      .map((r) => (r.vendor || "").trim())
      .find((v) => v);
    if (lastVendor) {
      await admin.from("schedules").update({ vendor: lastVendor }).eq("id", id);
    }
  }

  rv();
  return { ok: true };
}

// 일정 현장 정보 저장 (장소/담당자/연락처/발주처/비고)
export async function updateScheduleInfo(id, fields = {}) {
  await requireAdmin();
  const admin = createAdminClient();
  const clean = (v) => {
    const s = typeof v === "string" ? v.trim() : v;
    return s ? s : null;
  };
  const { error } = await admin
    .from("schedules")
    .update({
      location: clean(fields.location),
      client_manager: clean(fields.client_manager),
      client_phone: clean(fields.client_phone),
      vendor: clean(fields.vendor),
      note: clean(fields.note),
    })
    .eq("id", id);
  if (error) {
    if (/client_manager|client_phone|vendor|note|column/i.test(error.message)) {
      return { error: "현장 정보 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }
  rv();
  return { ok: true };
}

// 배차 물품(준비물) 저장
export async function setScheduleSupplies(id, supplies) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedules")
    .update({ supplies: (supplies ?? "").trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 배차 비고 저장
export async function setScheduleRemark(id, remark) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("schedules")
    .update({ remark: (remark ?? "").trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

// 배차 순번 재정렬 — stops: [{ id, type: 'install'|'pickup' }] 순서대로
export async function reorderStops(stops = []) {
  await requireAdmin();
  const admin = createAdminClient();
  for (let i = 0; i < stops.length; i++) {
    const col = stops[i].type === "install" ? "install_seq" : "pickup_seq";
    const { error } = await admin
      .from("schedules")
      .update({ [col]: i })
      .eq("id", stops[i].id);
    if (error) {
      if (/install_seq|pickup_seq|column/i.test(error.message)) {
        return { error: "배차 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
      }
      return { error: error.message };
    }
  }
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

// ─────────────────────────────────────────────
// 일정 기기 배정 (수량 기준) + 가용 재고 검증
function equipFriendly(error) {
  if (error?.message && /schedule_items|equipment.*does not exist|Could not find the table/i.test(error.message)) {
    return { error: "재고 연동 테이블(schedule_items)이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
  }
  return { error: error.message };
}

// 특정 일정에 특정 종류를 quantity 대 배정 (0이면 배정 해제)
export async function setScheduleItem(scheduleId, category, quantity) {
  await requireAdmin();
  const cat = (category ?? "").trim();
  const qty = parseInt(quantity, 10);
  if (!scheduleId) return { error: "일정이 없습니다." };
  if (!cat) return { error: "기기 종류를 선택하세요." };
  if (!Number.isFinite(qty) || qty < 0) return { error: "수량이 올바르지 않습니다." };

  const admin = createAdminClient();

  // 해제
  if (qty === 0) {
    const { error } = await admin
      .from("schedule_items")
      .delete()
      .eq("schedule_id", scheduleId)
      .eq("category", cat);
    if (error) return equipFriendly(error);
    rv();
    return { ok: true };
  }

  // 이 일정 기간
  const { data: sched, error: sErr } = await admin
    .from("schedules")
    .select("id, start_date, end_date")
    .eq("id", scheduleId)
    .maybeSingle();
  if (sErr) return { error: sErr.message };
  if (!sched) return { error: "일정을 찾을 수 없습니다." };

  // 보유 대수(운영중) & 다른 일정 점유 계산용 데이터
  const [{ data: equip, error: eErr }, { data: items, error: iErr }, { data: scheds }] =
    await Promise.all([
      admin.from("equipment").select("category").eq("active", true).eq("category", cat),
      admin.from("schedule_items").select("schedule_id, category, quantity"),
      admin.from("schedules").select("id, start_date, end_date"),
    ]);
  if (eErr) return equipFriendly(eErr);
  if (iErr) return equipFriendly(iErr);

  const totals = { [cat]: (equip ?? []).length };
  const schedById = Object.fromEntries((scheds ?? []).map((s) => [s.id, s]));
  const { total, available } = availableFor(
    totals,
    items ?? [],
    schedById,
    cat,
    sched.start_date,
    sched.end_date,
    scheduleId // 자기 자신 제외
  );

  if (total === 0) return { error: `'${cat}' 보유 기기가 없습니다. 재고 관리에서 먼저 등록하세요.` };
  if (qty > available) {
    return {
      error: `이 기간 '${cat}' 가용 ${available}대(보유 ${total}대). ${qty}대는 배정할 수 없습니다.`,
    };
  }

  // upsert (schedule_id, category)
  const { error } = await admin
    .from("schedule_items")
    .upsert({ schedule_id: scheduleId, category: cat, quantity: qty }, { onConflict: "schedule_id,category" });
  if (error) return equipFriendly(error);
  rv();
  return { ok: true };
}

export async function removeScheduleItem(scheduleId, category) {
  return setScheduleItem(scheduleId, category, 0);
}
