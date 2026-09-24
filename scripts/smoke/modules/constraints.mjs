/** 무결성 제약 — 잘못된 값을 DB가 실제로 막는지 */
import { makeChecker } from "../harness.mjs";

export default async function run(db) {
  const c = makeChecker("무결성 제약");

  // 금액은 음수 불가
  await c.rejects("계약 금액 음수 거부", db,
    `insert into inquiries (company_name, contract_amount) values ('음수테스트', -1)`);
  await c.accepts("계약 금액 0 허용", db,
    `insert into inquiries (company_name, contract_amount) values ('영원테스트', 0)`);

  // 진행 상태는 정해진 값만
  await c.rejects("허용되지 않은 상태값 거부", db,
    `insert into inquiries (company_name, status) values ('상태테스트', '이상한상태')`);
  await c.accepts("정상 상태값 허용", db,
    `insert into inquiries (company_name, status) values ('상태정상', 'quoted')`);

  // 날짜 순서
  await c.rejects("종료일이 시작일보다 앞서면 거부", db,
    `insert into schedules (title, start_date, end_date) values ('날짜역전','2026-05-10','2026-05-01')`);
  await c.accepts("같은 날 시작·종료 허용(당일 행사)", db,
    `insert into schedules (title, start_date, end_date) values ('당일행사','2026-05-10','2026-05-10')`);

  // 진행 단계 범위
  await c.rejects("단계 5 거부(0~4만 허용)", db,
    `insert into schedules (title, start_date, stage) values ('단계초과','2026-05-10', 5)`);
  await c.rejects("단계 음수 거부", db,
    `insert into schedules (title, start_date, stage) values ('단계음수','2026-05-10', -1)`);

  // 배정 수량
  const s = await db.query(`insert into schedules (title, start_date) values ('수량테스트','2026-05-10') returning id`);
  const sid = s.rows[0].id;
  await c.rejects("배정 수량 0 거부", db,
    `insert into schedule_items (schedule_id, category, quantity) values ('${sid}','가챠머신', 0)`);
  await c.accepts("배정 수량 1 허용", db,
    `insert into schedule_items (schedule_id, category, quantity) values ('${sid}','가챠머신', 1)`);

  // 단가 음수
  await c.rejects("배송료 음수 거부", db,
    `insert into shipping_rates (region, quick_fee) values ('음수지역', -100)`);

  return c;
}
