/** 정산 분리 — inquiries 의 정산 컬럼 10개를 별도 표로 옮기는 마이그레이션 */
import { makeChecker } from "../harness.mjs";

export default async function run(db) {
  const c = makeChecker("정산 분리");

  const t = await db.query(`select to_regclass('public.settlements') as t`);
  c.ok("settlements 표 생성됨", t.rows[0].t !== null);

  // seed 에서 넣은 3건 중 정산 흔적이 있는 2건만 복사돼야 한다
  const copied = await db.query(`select count(*)::int as n from settlements`);
  c.eq("정산 기록 있는 건만 복사됨", copied.rows[0].n, 2);

  const moved = await db.query(`
    select s.contract_amount, s.paid_amount, s.memo
    from settlements s join inquiries i on i.id = s.inquiry_id
    where i.company_name = '스모크_정산완납'`);
  c.eq("계약 금액이 그대로 옮겨짐", Number(moved.rows[0]?.contract_amount), 1000000);
  c.eq("실입금액이 그대로 옮겨짐", Number(moved.rows[0]?.paid_amount), 1000000);
  c.eq("정산 비고가 그대로 옮겨짐", moved.rows[0]?.memo, "완납 확인");

  // 원본은 그대로 남아 기존 화면이 계속 동작해야 한다 (2단계 이관의 핵심)
  const orig = await db.query(`
    select contract_amount from inquiries where company_name='스모크_정산완납'`);
  c.eq("원본 컬럼도 그대로 유지(기존 화면 호환)", Number(orig.rows[0]?.contract_amount), 1000000);

  // 한 문의에 정산은 하나만
  const one = await db.query(`select inquiry_id from settlements limit 1`);
  await c.rejects("같은 문의에 정산 두 번 생성 거부", db,
    `insert into settlements (inquiry_id) values ('${one.rows[0].inquiry_id}')`);

  // 금액 음수 방지
  await c.rejects("정산 금액 음수 거부", db,
    `insert into settlements (inquiry_id, paid_amount)
     select id, -1 from inquiries where company_name='스모크_정산없음'`);

  // 문의를 지우면 정산도 함께 지워져야 한다 (고아 방지)
  const before = (await db.query(`select count(*)::int as n from settlements`)).rows[0].n;
  await db.exec(`delete from inquiries where company_name='스모크_정산완납'`);
  const after = (await db.query(`select count(*)::int as n from settlements`)).rows[0].n;
  c.eq("문의 삭제 시 정산도 함께 삭제", after, before - 1);

  return c;
}

export async function seed(db) {
  await db.exec(`
    insert into inquiries (company_name, contact_name, contract_amount, paid_amount, paid_date, settle_memo) values
      ('스모크_정산완납', '김완납', 1000000, 1000000, '2026-05-10', '완납 확인')`);
  await db.exec(`
    insert into inquiries (company_name, contact_name, contract_amount) values
      ('스모크_정산부분', '이부분', 500000)`);
  await db.exec(`
    insert into inquiries (company_name, contact_name) values
      ('스모크_정산없음', '박없음')`);
}
