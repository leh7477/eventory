"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail, buildInquiryMail } from "@/lib/mail";
import { sendTelegram, buildInquiryTelegram } from "@/lib/telegram";
import { PRIVACY_VERSION } from "@/lib/privacy";
import { validateInquiry, cleanInquiry } from "@/lib/inquiry";

/**
 * 견적 문의 접수 (공개 — 로그인 없이 호출된다)
 *
 * 전에는 브라우저가 Supabase 에 직접 저장했다. 서버를 거치게 바꾼 이유:
 *   1) 접수 알림 메일을 보내려면 서버가 필요하다
 *   2) 브라우저 직접 저장은 제한이 없어 한 번에 50건도 들어갔다 (스팸)
 *   3) 필수값 검사를 화면 밖에서도 강제할 수 있다
 */

// 같은 IP 의 최근 제출 시각 — 스팸 방지용.
// 메모리에만 두므로 서버를 다시 띄우면 비워진다. 개인정보를 저장하지 않으려는 선택이다.
const recent = new Map();
const WINDOW_MS = 60_000; // 1분
const MAX_IN_WINDOW = 3;

function tooMany(ip) {
  if (!ip) return false;
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  // 오래된 기록 정리 (Map 이 무한히 커지지 않도록)
  if (recent.size > 500) {
    for (const [k, v] of recent) {
      if (v.every((t) => now - t >= WINDOW_MS)) recent.delete(k);
    }
  }
  if (list.length >= MAX_IN_WINDOW) {
    recent.set(ip, list);
    return true;
  }
  recent.set(ip, [...list, now]);
  return false;
}

export async function submitInquiry(form = {}) {
  const err = validateInquiry(form);
  if (err) return { error: err };

  let ip = null;
  try {
    const h = headers();
    ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
  } catch {
    // 헤더를 못 읽는 맥락이면 제한 없이 진행
  }
  if (tooMany(ip)) {
    return { error: "잠시 후 다시 시도해주세요. (짧은 시간에 너무 많이 보냈습니다)" };
  }

  const payload = cleanInquiry(form);

  const admin = createAdminClient();
  let { error } = await admin.from("inquiries").insert({
    ...payload,
    privacy_agreed_at: new Date().toISOString(),
    privacy_version: PRIVACY_VERSION,
  });
  // 동의 기록 컬럼이 없는 DB 면 본문만 저장하고 진행
  if (error && /privacy_agreed_at|privacy_version|column/i.test(error.message)) {
    ({ error } = await admin.from("inquiries").insert(payload));
  }
  if (error) {
    console.error("문의 저장 실패:", error.message);
    return { error: "전송에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  // 알림 — 실패해도 접수는 성공으로 처리한다 (손님 잘못이 아니다).
  // 메일과 텔레그램을 동시에 보내고, 한쪽이 막혀도 다른 쪽은 간다.
  const [mailRes, tgRes] = await Promise.all([
    sendMail(buildInquiryMail(payload)),
    sendTelegram(buildInquiryTelegram(payload)),
  ]);
  if (!mailRes.ok) console.error("문의 알림 메일 미발송:", mailRes.reason);
  if (!tgRes.ok) console.error("문의 알림 텔레그램 미발송:", tgRes.reason);

  return { ok: true };
}
