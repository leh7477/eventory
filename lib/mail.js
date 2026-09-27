import nodemailer from "nodemailer";
import { SITE } from "@/lib/constants";

/**
 * 메일 발송 — 네이버 SMTP
 *
 * 원칙: 메일 실패가 본래 작업을 막아서는 안 된다.
 *   손님 입장에서는 메일이 가든 말든 문의가 접수돼야 한다.
 *   그래서 이 파일의 함수는 절대 throw 하지 않고 { ok, reason } 만 돌려준다.
 *
 * 필요한 환경변수 (.env.local, git 제외 대상)
 *   NAVER_MAIL_USER  네이버 아이디 (@naver.com 앞부분 또는 전체 주소)
 *   NAVER_MAIL_PASS  애플리케이션 비밀번호 (로그인 비밀번호 아님)
 *   MAIL_TO          받는 주소 (없으면 SITE.email)
 *
 * 네이버 설정
 *   메일 → 환경설정 → POP3/IMAP 설정 → SMTP 사용함
 *   네이버 계정 → 보안설정 → 애플리케이션 비밀번호
 */

const HOST = "smtp.naver.com";
const PORT = 465; // SSL

function config() {
  const user = process.env.NAVER_MAIL_USER;
  const pass = process.env.NAVER_MAIL_PASS;
  if (!user || !pass) return null;
  const from = user.includes("@") ? user : `${user}@naver.com`;
  return {
    user: from,          // 네이버는 로그인 아이디로 전체 주소를 받는다
    pass,
    from,
    to: process.env.MAIL_TO || SITE.email,
  };
}

/** 설정이 다 돼 있는지 (화면에서 안내용) */
export function mailReady() {
  return config() !== null;
}

/**
 * 메일 한 통 보내기.
 * @returns {Promise<{ok: true} | {ok: false, reason: string}>}
 */
export async function sendMail({ subject, text, html }) {
  const c = config();
  if (!c) return { ok: false, reason: "메일 설정 없음 (NAVER_MAIL_USER/PASS)" };

  try {
    const tx = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: true,
      auth: { user: c.user, pass: c.pass },
      // 서버가 응답 없을 때 요청이 오래 붙잡히지 않도록
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    await tx.sendMail({
      from: `"${SITE.nameKo}" <${c.from}>`,
      to: c.to,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (e) {
    // 여기서 삼키는 이유: 위 주석의 원칙 참고
    console.error("메일 발송 실패:", e?.message);
    return { ok: false, reason: e?.message ?? "알 수 없는 오류" };
  }
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** 견적 문의 알림 메일 본문 만들기 (DB 없이 동작 — 스모크 테스트 대상) */
export function buildInquiryMail(q = {}) {
  const 업체 = q.company_name || "(업체명 없음)";
  const 기간 =
    q.event_start && q.event_end
      ? q.event_start === q.event_end
        ? q.event_start
        : `${q.event_start} ~ ${q.event_end}`
      : q.event_start || "-";
  const 장소 = [q.address, q.address_detail].filter(Boolean).join(" ") || "-";

  const rows = [
    ["업체명", 업체],
    ["담당자", [q.contact_name, q.phone].filter(Boolean).join(" / ") || "-"],
    ["이메일", q.email || "-"],
    ["문의 제품", [q.product, q.usage && `(${q.usage})`].filter(Boolean).join(" ") || "-"],
    ["행사 기간", 기간],
    ["장소", 장소],
    ["문의 내용", q.message || "-"],
  ];

  const subject = `[${SITE.nameKo}] 새 견적 문의 — ${업체}`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = `
<div style="font-family:system-ui,-apple-system,'Malgun Gothic',sans-serif;max-width:560px">
  <h2 style="margin:0 0 4px;font-size:18px;color:#2B2233">새 견적 문의가 접수되었습니다</h2>
  <p style="margin:0 0 16px;font-size:13px;color:#2B2233;opacity:.55">${esc(업체)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${rows
      .map(
        ([k, v]) => `<tr>
      <td style="padding:8px 10px;background:#FAF8F9;color:#2B2233;opacity:.6;width:92px;vertical-align:top;white-space:nowrap">${esc(k)}</td>
      <td style="padding:8px 10px;color:#2B2233;border-bottom:1px solid #EFECEE">${esc(v).replace(/\n/g, "<br>")}</td>
    </tr>`
      )
      .join("")}
  </table>
  <p style="margin:16px 0 0;font-size:13px">
    <a href="${SITE_URL_SAFE()}/admin/inquiries" style="color:#FF5470;font-weight:700;text-decoration:none">관리자에서 보기 →</a>
  </p>
</div>`.trim();

  return { subject, text, html };
}

// SITE_URL 은 환경에 따라 바뀌므로 함수로 감싼다
function SITE_URL_SAFE() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.eventland.co.kr";
}
