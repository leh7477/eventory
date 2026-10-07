/**
 * 입금 내역 분리 — 기존 1회 입금이 손실 없이 옮겨지는지
 *
 * 이 검사가 중요한 이유
 *   settlements.paid_amount 는 상태 뱃지·미수 계산·백업·CSV 가 모두 보는 값이다.
 *   payments 로 옮기면서 한 건이라도 빠지면 '입금했는데 미입금으로 뜨는' 상태가
 *   되고, 숫자가 틀린 채로 정산이 돌아간다. 눈으로는 알아채기 어렵다.
 *
 *   또 마이그레이션은 두 번 실행될 수 있다(APPLY-ALL 재실행). 그때 입금이
 *   두 번 들어가면 매출이 두 배로 보인다. 중복 방지도 함께 확인한다.
 */
import { makeChecker } from "../harness.mjs";

// PGlite 는 date 를 Date 객체로 준다 — 비교 전에 YYYY-MM-DD 로 맞춘다
const ymd = (v) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10);

export default async function run(db) {
  const c = makeChecker("입금 내역 분리 (payments)");

  const q = async (sql) => (await db.query(sql)).rows;

  /* 1) 표와 제약 */
  const cols = await q(`
    select column_name from information_schema.columns
    where table_name = 'payments' order by column_name`);
  c.eq(
    "컬럼 구성",
    cols.map((r) => r.column_name).sort(),
    ["amount", "created_at", "created_by", "id", "inquiry_id", "memo", "paid_date"]
  );

  /* 2) 기존 입금이 옮겨졌는가 — 핵심 */
  const moved = await q(`
    select i.company_name, p.paid_date, p.amount, p.created_by
    from payments p join inquiries i on i.id = p.inquiry_id
    where i.company_name like '스모크입금%'
    order by i.company_name`);

  c.eq("옮겨진 입금 건수", moved.length, 2);

  const by = Object.fromEntries(moved.map((r) => [r.company_name, r]));
  c.eq("완납 건 금액", Number(by["스모크입금_완납"]?.amount), 1100000);
  c.eq("완납 건 입금일", ymd(by["스모크입금_완납"]?.paid_date), "2026-02-10");
  c.eq("처리자도 함께 옮겨짐", by["스모크입금_완납"]?.created_by, "김입금");
  c.eq("부분입금 건 금액", Number(by["스모크입금_부분"]?.amount), 500000);

  /* 3) 입금이 없던 건은 행이 생기지 않아야 한다 */
  const none = await q(`
    select count(*)::int as n from payments p
    join inquiries i on i.id = p.inquiry_id
    where i.company_name = '스모크입금_없음'`);
  c.eq("입금 전 건은 행이 없음", none[0].n, 0);

  /* 4) 합계가 settlements 와 어긋나지 않는가 */
  const sums = await q(`
    select i.company_name,
           s.paid_amount::int as settle,
           coalesce(sum(p.amount), 0)::int as pay
    from inquiries i
    join settlements s on s.inquiry_id = i.id
    left join payments p on p.inquiry_id = i.id
    where i.company_name like '스모크입금%'
    group by i.company_name, s.paid_amount
    order by i.company_name`);
  for (const r of sums) {
    c.eq(`${r.company_name} 합계 일치`, r.pay, Number(r.settle) || 0);
  }

  /* 5) 금액 0 이하는 막혀야 한다 */
  const bad = await q(`
    select count(*)::int as n from pg_constraint where conname = 'chk_payments_amount'`);
  c.eq("금액 양수 제약 존재", bad[0].n, 1);

  return c;
}

/**
 * 마이그레이션 전 표본 — 완납 / 부분입금 / 입금 전 세 가지.
 *
 * settlements 는 마이그레이션이 만드는 표라 시드 시점엔 없다.
 * 옛 구조대로 inquiries 컬럼에 넣어두면 settlements 마이그레이션이 옮기고,
 * 이어서 payments 마이그레이션이 그걸 다시 건별로 옮긴다 — 실제 순서와 같다.
 */
export async function seed(db) {
  await db.exec(`
    insert into inquiries (company_name, contact_name, contract_amount, paid_amount, paid_date, paid_by, paid_at) values
      ('스모크입금_완납', '김', 1000000, 1100000, '2026-02-10', '김입금', '2026-02-10T01:00:00Z')`);

  await db.exec(`
    insert into inquiries (company_name, contact_name, contract_amount, paid_amount, paid_date, paid_by) values
      ('스모크입금_부분', '이', 2000000, 500000, '2026-02-20', '이입금')`);

  // 입금 전 — 계약만 있고 입금 정보 없음
  await db.exec(`
    insert into inquiries (company_name, contact_name, contract_amount) values
      ('스모크입금_없음', '박', 3000000)`);
}
