/**
 * 정산 순수 로직 — lib/admin/settlements.js 의 실제 코드를 그대로 가져와 검증한다.
 *
 * lib/ 는 Next 용 .js(CJS 취급)라 .mjs 에서 바로 import 할 수 없다.
 * 그래서 파일을 읽어 export 만 떼고 평가한다. 로직 자체는 실제 소스 그대로다.
 */
import fs from "node:fs";
import path from "node:path";
import { makeChecker, ROOT } from "../harness.mjs";

function loadPureFns() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "admin", "settlements.js"), "utf8");
  // DB 접근 함수(async, admin 인자)는 제외하고 순수 함수만 평가한다
  const cut = src.indexOf("// ── DB 접근");
  const pure = (cut > 0 ? src.slice(0, cut) : src).replace(/^export /gm, "");
  const factory = new Function(
    `${pure}; return { toAmount, buildSettlementUpdate, toInquiryShape, mergeSettlement };`
  );
  return factory();
}

export default async function run() {
  const c = makeChecker("정산 로직 (lib/admin/settlements.js)");
  const { toAmount, buildSettlementUpdate, toInquiryShape, mergeSettlement } = loadPureFns();

  // 금액 정규화 — 화면에서 "1,000,000" 처럼 들어온다
  c.eq("쉼표 있는 금액 → 숫자", toAmount("1,000,000"), 1000000);
  c.eq("원 표기 섞인 금액 → 숫자", toAmount("₩ 500,000 원"), 500000);
  c.eq("빈 값 → null", toAmount(""), null);
  c.eq("null → null", toAmount(null), null);
  c.eq("0 → 0 (입금 0원도 유효)", toAmount("0"), 0);

  // 날짜를 넣으면 처리자·시각 도장이 찍힌다
  const 넣음 = buildSettlementUpdate({ paid_date: "2026-05-10" }, "이은호", "2026-05-10T01:00:00.000Z");
  c.eq("입금일 저장", 넣음.core.paid_date, "2026-05-10");
  c.eq("입금 처리자 기록", 넣음.stamps.paid_by, "이은호");
  c.eq("입금 처리 시각 기록", 넣음.stamps.paid_at, "2026-05-10T01:00:00.000Z");

  // 날짜를 지우면 도장도 지워져야 한다 (안 지우면 옛 처리자가 남아 오해를 부른다)
  const 지움 = buildSettlementUpdate({ paid_date: "" }, "이은호", "2026-05-10T01:00:00.000Z");
  c.eq("입금일 비움", 지움.core.paid_date, null);
  c.eq("입금 처리자도 함께 비움", 지움.stamps.paid_by, null);
  c.eq("입금 시각도 함께 비움", 지움.stamps.paid_at, null);

  // 전달하지 않은 필드는 건드리지 않는다 (부분 저장)
  const 부분 = buildSettlementUpdate({ paid_amount: "300000" }, "권순복");
  c.ok("보내지 않은 계산서 발행일은 그대로 둠", !("invoice_date" in 부분.core));
  c.ok("보내지 않은 필드의 도장도 찍지 않음", !("invoice_by" in 부분.stamps));
  c.eq("보낸 금액만 반영", 부분.core.paid_amount, 300000);

  // 빈 요청은 아무 일도 하지 않는다
  c.ok("빈 요청은 empty 로 표시", buildSettlementUpdate({}).empty);

  // 컬럼 이름 되돌리기 (settlements.memo ↔ inquiries.settle_memo)
  const shape = toInquiryShape({ memo: "완납", paid_amount: 100 });
  c.eq("memo → settle_memo 로 변환", shape.settle_memo, "완납");
  c.ok("memo 키는 남지 않음", !("memo" in shape));
  c.eq("다른 필드는 그대로", shape.paid_amount, 100);

  // 읽기 — 새 표가 없으면 기존 컬럼을 쓴다
  const 구버전 = mergeSettlement({ contract_amount: 700000, settle_memo: "구버전" }, null);
  c.eq("새 표 없으면 기존 컬럼 사용", 구버전.contract_amount, 700000);
  c.eq("기존 비고 사용", 구버전.settle_memo, "구버전");
  c.eq("출처 표시", 구버전._source, "inquiries");

  // 읽기 — 새 표가 있으면 그쪽이 이긴다
  const 신버전 = mergeSettlement(
    { contract_amount: 700000, settle_memo: "옛값" },
    { contract_amount: 900000, memo: "새값" }
  );
  c.eq("새 표가 있으면 새 값이 이김", 신버전.contract_amount, 900000);
  c.eq("새 표의 memo 가 settle_memo 로", 신버전.settle_memo, "새값");
  c.eq("출처 표시", 신버전._source, "settlements");

  // 새 표에 값이 비어 있으면 기존 값으로 메운다 (이관 중 부분 공백 대비)
  const 혼합 = mergeSettlement(
    { contract_amount: 700000, paid_amount: 700000 },
    { contract_amount: 900000, paid_amount: null }
  );
  c.eq("새 표 값이 있으면 그것", 혼합.contract_amount, 900000);
  c.eq("새 표 값이 비면 기존 값으로 메움", 혼합.paid_amount, 700000);

  return c;
}
