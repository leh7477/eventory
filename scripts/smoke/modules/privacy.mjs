/** 개인정보 동의 기록 — 견적 문의 폼이 동의 시각·버전을 남기는지 */
import { makeChecker } from "../harness.mjs";

export default async function run(db) {
  const c = makeChecker("개인정보 동의 기록");

  const cols = await db.query(`
    select column_name from information_schema.columns
    where table_name='inquiries' and column_name in ('privacy_agreed_at','privacy_version')`);
  c.eq("동의 기록 컬럼 2개 생성", cols.rows.length, 2);

  // 폼이 보내는 것과 같은 모양으로 저장해 본다
  await c.accepts("동의 정보와 함께 문의 저장", db, `
    insert into inquiries (company_name, contact_name, phone, email, privacy_agreed_at, privacy_version)
    values ('스모크상사','김담당','010-1111-2222','a@example.com', now(), '1.0')`);

  const r = await db.query(`
    select privacy_version, privacy_agreed_at is not null as 시각있음
    from inquiries where company_name='스모크상사'`);
  c.eq("동의 버전이 그대로 저장됨", r.rows[0]?.privacy_version, "1.0");
  c.ok("동의 시각이 기록됨", r.rows[0]?.시각있음);

  // 동의 없이 들어온 과거 데이터도 문제없이 공존해야 한다
  await c.accepts("동의 정보 없는 문의도 저장 가능(과거 데이터 호환)", db, `
    insert into inquiries (company_name, contact_name) values ('과거상사','이전담당')`);

  return c;
}
