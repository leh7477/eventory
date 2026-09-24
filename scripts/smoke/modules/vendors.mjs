/** 거래처 연결 — 이름(글자) 연결을 외래키로 바꾸는 마이그레이션 */
import { makeChecker } from "../harness.mjs";

export default async function run(db, { beforeMigration }) {
  const c = makeChecker("거래처 연결 (고아 데이터 해소)");

  // beforeMigration 에서 심어둔 상황을 검증한다:
  //   일정에는 '픽셀애드'(등록됨)와 '아무개디자인'(미등록)이 적혀 있었다
  const orphan = await db.query(`
    select count(*)::int as n from schedules s
    where s.vendor is not null and not exists (select 1 from vendors v where v.name = s.vendor)`);
  c.eq("마이그레이션 후 고아 거래처 0건", orphan.rows[0].n, 0);

  const registered = await db.query(`select name from vendors order by name`);
  c.ok("미등록이던 '아무개디자인'이 거래처로 등록됨",
    registered.rows.some((r) => r.name === "아무개디자인"),
    `현재 거래처: ${registered.rows.map((r) => r.name).join(", ")}`);

  const linked = await db.query(`
    select count(*)::int as n from schedules where vendor is not null and vendor_id is null`);
  c.eq("발주처가 적힌 일정은 모두 vendor_id 연결됨", linked.rows[0].n, 0);

  // 이름을 바꿔도 연결이 유지되는지 — 이게 외래키를 쓰는 이유
  await db.exec(`update vendors set name='픽셀애드(변경)' where name='픽셀애드'`);
  const after = await db.query(`
    select v.name from schedules s join vendors v on v.id = s.vendor_id
    where s.title='스모크_픽셀'`);
  c.eq("거래처 이름을 바꾸면 일정도 새 이름을 따라감", after.rows[0]?.name, "픽셀애드(변경)");

  return c;
}

/** 마이그레이션 전에 심어둘 상황 — 실제 운영에서 발견된 고아 데이터 재현 */
export async function seed(db) {
  await db.exec(`insert into vendors (name) values ('픽셀애드')`);
  await db.exec(`
    insert into schedules (title, start_date, vendor) values
      ('스모크_픽셀',   '2026-05-01', '픽셀애드'),
      ('스모크_아무개', '2026-05-02', '아무개디자인')`);
}
