import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActor } from "@/lib/admin/sections";

/**
 * 변경 이력·개인정보 조회 기록을 audit_log 테이블에 남긴다.
 *
 * 설계 의도
 *  - 원본을 삭제해도 "누가 지웠는지"가 남도록 별도 테이블에 기록한다.
 *  - 기록 실패가 본래 작업을 막아서는 안 된다. 그래서 절대 throw 하지 않는다.
 *  - audit_log 테이블이 아직 없으면 조용히 넘어간다.
 *    (supabase/migrations/20260924-audit-log.sql 실행 전에도 화면이 정상 동작해야 함)
 *
 * @param {object}  p
 * @param {object}  p.user     requireSection() 이 돌려준 사용자
 * @param {string}  p.section  메뉴 key (rates / inventory / vendors / inquiries ...)
 * @param {string}  p.action   create | update | delete | view_personal
 * @param {string} [p.table]   대상 테이블
 * @param {string} [p.id]      대상 행 id
 * @param {object} [p.detail]  변경 내용 요약
 */
export async function writeAudit({ user, section, action, table, id, detail }) {
  try {
    let ip = null;
    try {
      const h = headers();
      // nginx 가 넘겨주는 실제 접속자 IP (Cloudflare 뒤에서도 유지)
      ip =
        h.get("x-forwarded-for")?.split(",")[0].trim() ||
        h.get("x-real-ip") ||
        null;
    } catch {
      // 헤더를 못 읽는 맥락이면 IP 없이 기록
    }

    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor: user ? logActor(user) : null,
      actor_id: user?.id ?? null,
      section,
      action,
      target_table: table ?? null,
      target_id: id != null ? String(id) : null,
      detail: detail ?? null,
      ip,
    });

    // 테이블이 아직 없는 경우는 정상 상황으로 간주하고 조용히 넘어간다
    if (error && !/audit_log|relation|does not exist|schema cache/i.test(error.message)) {
      console.error("audit_log 기록 실패:", error.message);
    }
  } catch (e) {
    console.error("audit_log 기록 예외:", e?.message);
  }
}
