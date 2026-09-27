/**
 * 텔레그램 알림 — 견적 문의가 들어오면 폰으로 바로 보낸다.
 *
 * 메일과 같은 원칙: 알림 실패가 본래 작업을 막지 않는다.
 *   절대 throw 하지 않고 { ok, reason } 만 돌려준다.
 *
 * 환경변수 (.env.local, git 제외 대상)
 *   TELEGRAM_BOT_TOKEN  BotFather 에서 받은 토큰
 *   TELEGRAM_CHAT_ID    받을 채팅방 id (findChatId 로 찾는다)
 *
 * 메일보다 나은 점: 즉시 도착하고, 네이버처럼 90일 미사용 자동 해제가 없다.
 * 대신 텔레그램 계정이 필요하므로 메일과 함께 쓰는 것을 전제로 한다.
 */

const API = "https://api.telegram.org/bot";

function token() {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/** 설정이 다 돼 있는지 */
export function telegramReady() {
  return !!(token() && process.env.TELEGRAM_CHAT_ID);
}

/**
 * 메시지 보내기.
 * @returns {Promise<{ok: true} | {ok: false, reason: string}>}
 */
export async function sendTelegram(text) {
  const t = token();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!t || !chatId) return { ok: false, reason: "텔레그램 설정 없음 (TOKEN/CHAT_ID)" };

  // 서버에서 간헐적으로 연결이 늦어지는 경우가 있어 두 번까지 다시 시도한다.
  // (운영 서버에서 ETIMEDOUT 이 한 번 발생한 적이 있고, 재시도하니 바로 성공했다)
  let last = "알 수 없는 오류";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`${API}${t}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) return { ok: true };
      last = data.description || `HTTP ${res.status}`;
      // 토큰이 틀렸거나 채팅방이 잘못된 경우는 다시 시도해도 소용없다
      if (res.status === 401 || res.status === 400) break;
    } catch (e) {
      last = e?.message ?? "알 수 없는 오류";
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  console.error("텔레그램 발송 실패:", last);
  return { ok: false, reason: last };
}
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 견적 문의 알림 메시지 만들기 (DB 없이 동작 — 스모크 테스트 대상) */
export function buildInquiryTelegram(q = {}) {
  const 기간 =
    q.event_start && q.event_end
      ? q.event_start === q.event_end
        ? q.event_start
        : `${q.event_start} ~ ${q.event_end}`
      : q.event_start || "-";
  const 장소 = [q.address, q.address_detail].filter(Boolean).join(" ") || "-";

  const lines = [
    `🔔 <b>새 견적 문의</b>`,
    ``,
    `<b>${esc(q.company_name || "(업체명 없음)")}</b>`,
    `👤 ${esc([q.contact_name, q.phone].filter(Boolean).join(" / ") || "-")}`,
    `📦 ${esc([q.product, q.usage && `(${q.usage})`].filter(Boolean).join(" ") || "-")}`,
    `📅 ${esc(기간)}`,
    `📍 ${esc(장소)}`,
  ];
  if (q.message) lines.push(``, `💬 ${esc(q.message)}`);
  return lines.join("\n");
}

/**
 * 봇에게 온 최근 메시지에서 채팅방 id 를 찾는다.
 * 봇은 먼저 말을 걸 수 없어, 사용자가 한 번 메시지를 보내야 id 를 알 수 있다.
 */
export async function findChatId() {
  const t = token();
  if (!t) return { ok: false, reason: "TELEGRAM_BOT_TOKEN 없음" };
  try {
    const res = await fetch(`${API}${t}/getUpdates`);
    const data = await res.json();
    if (!data.ok) return { ok: false, reason: data.description || "조회 실패" };
    const chats = [];
    for (const u of data.result ?? []) {
      const c = u.message?.chat ?? u.channel_post?.chat;
      if (c && !chats.some((x) => x.id === c.id)) {
        chats.push({
          id: c.id,
          type: c.type,
          name: c.title || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.username || "",
        });
      }
    }
    return { ok: true, chats };
  } catch (e) {
    return { ok: false, reason: e?.message ?? "알 수 없는 오류" };
  }
}
