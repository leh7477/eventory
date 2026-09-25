"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActor } from "@/lib/admin/sections";
import { writeAudit } from "@/lib/admin/audit";
import { saveSettlement } from "@/lib/admin/settlements";

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
