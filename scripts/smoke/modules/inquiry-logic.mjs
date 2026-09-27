/** 견적 문의 검사 + 알림 메일 본문 — 실제 소스를 가져와 검증 */
import fs from "node:fs";
import path from "node:path";
import { makeChecker, ROOT } from "../harness.mjs";

function load(file, names) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  // import 줄과 export 키워드를 걷어내고 순수 함수만 평가한다
  const pure = src
    .split(String.fromCharCode(10))
    .filter((l) => !l.trim().startsWith("import "))
    .join(String.fromCharCode(10))
    .replace(/^export /gm, "");
  // 실제 소스가 쓰는 외부 값(SITE, process.env)을 같은 이름으로 넣어준다
  const siteSrc = fs.readFileSync(path.join(ROOT, "lib", "constants.js"), "utf8");
  const SITE = new Function(siteSrc.replace(/^export /gm, "") + "; return SITE;")();
  return new Function("SITE", "process", `${pure}; return { ${names.join(", ")} };`)(
    SITE,
    { env: {} }
  );
}

const OK = {
  company_name: "가나다기획", contact_name: "김하나", phone: "010-1111-2222",
  email: "a@example.com", product: "가챠머신", usage: "임대",
  event_start: "2026-11-01", event_end: "2026-11-03",
  address: "서울 중구 세종대로 110", privacy_agree: true,
};

export default async function run() {
  const c = makeChecker("견적 문의 검사·메일 (lib/inquiry.js, lib/mail.js)");
  const I = load("lib/inquiry.js", ["validateInquiry", "cleanInquiry"]);

  // 정상 입력은 통과
  c.eq("모두 채우면 통과", I.validateInquiry(OK), null);

  // 필수값 누락
  c.eq("업체명 없으면 거부", I.validateInquiry({ ...OK, company_name: "" }), "업체명을(를) 입력해주세요.");
  c.eq("연락처 없으면 거부", I.validateInquiry({ ...OK, phone: "  " }), "연락처을(를) 입력해주세요.");
  c.eq("동의 없으면 거부", I.validateInquiry({ ...OK, privacy_agree: false }), "개인정보 수집·이용에 동의해주세요.");
  c.eq("장소 없으면 거부", I.validateInquiry({ ...OK, address: "" }), "장소를 입력하거나 '장소 미정'을 선택해주세요.");
  c.eq("종료일이 앞서면 거부", I.validateInquiry({ ...OK, event_end: "2026-10-01" }), "행사 종료일이 시작일보다 앞설 수 없습니다.");
  c.eq("장소 '미정'은 통과", I.validateInquiry({ ...OK, address: "미정" }), null);
  c.eq("같은 날 시작·종료 통과", I.validateInquiry({ ...OK, event_end: OK.event_start }), null);

  // 값 다듬기
  const cl = I.cleanInquiry({ ...OK, company_name: "  여백기획  ", message: "", address_detail: "   " });
  c.eq("앞뒤 공백 제거", cl.company_name, "여백기획");
  c.eq("빈 문자열은 null", cl.message, null);
  c.eq("공백만 있어도 null", cl.address_detail, null);
  const long = I.cleanInquiry({ ...OK, message: "가".repeat(3000) });
  c.eq("긴 문의 내용은 2000자로 자름", long.message.length, 2000);

  // 메일 본문
  const M = load("lib/mail.js", ["buildInquiryMail"]);
  const m = M.buildInquiryMail(cl);
  c.ok("제목에 업체명 포함", m.subject.includes("여백기획"), m.subject);
  c.ok("제목에 '새 견적 문의'", m.subject.includes("새 견적 문의"));
  c.ok("본문에 연락처 포함", m.text.includes("010-1111-2222"));
  c.ok("본문에 행사 기간 포함", m.text.includes("2026-11-01"));
  c.ok("HTML 본문도 만들어짐", m.html.startsWith("<div"));

  // 같은 날이면 기간을 한 번만 적는다
  const same = M.buildInquiryMail({ ...cl, event_start: "2026-11-01", event_end: "2026-11-01" });
  c.ok("같은 날이면 '~' 없이 한 번만", same.text.includes("행사 기간: 2026-11-01") && !same.text.includes("~"));

  // 꺾쇠가 든 입력이 HTML 을 깨뜨리지 않아야 한다
  const xss = M.buildInquiryMail({ ...cl, company_name: "<script>x</script>" });
  c.ok("HTML 특수문자 escape", !xss.html.includes("<script>") && xss.html.includes("&lt;script&gt;"));


  // 텔레그램 알림 본문
  const T = load("lib/telegram.js", ["buildInquiryTelegram"]);
  const tg = T.buildInquiryTelegram(cl);
  c.ok("업체명 포함", tg.includes("여백기획"));
  c.ok("연락처 포함", tg.includes("010-1111-2222"));
  c.ok("행사 기간 포함", tg.includes("2026-11-01"));
  c.ok("제목 줄에 새 견적 문의", tg.split(String.fromCharCode(10))[0].includes("새 견적 문의"));
  const tgSame = T.buildInquiryTelegram({ ...cl, event_start: "2026-11-01", event_end: "2026-11-01" });
  c.ok("같은 날이면 한 번만", !tgSame.includes("~"));
  const tgXss = T.buildInquiryTelegram({ ...cl, company_name: "<b>x</b>" });
  c.ok("HTML 특수문자 escape", !tgXss.includes("<b>x</b>") && tgXss.includes("&lt;b&gt;"));
  const tgNoMsg = T.buildInquiryTelegram({ ...cl, message: null });
  c.ok("문의 내용 없으면 그 줄 생략", !tgNoMsg.includes("💬"));

  return c;
}
