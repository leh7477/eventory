/** 변경 이력 — 원본을 지워도 "누가 지웠는지"가 남는지 */
import { makeChecker } from "../harness.mjs";

export default async function run(db) {
  const c = makeChecker("변경 이력 기록");

  const t = await db.query(`select to_regclass('public.audit_log') as t`);
  c.ok("audit_log 표 생성됨", t.rows[0].t !== null);

  // 코드가 writeAudit 으로 넣는 것과 같은 모양
  await c.accepts("이력 한 건 기록", db, `
    insert into audit_log (actor, section, action, target_table, target_id, detail, ip)
    values ('이은호','vendors','delete','vendors','abc-123','{"name":"사라진거래처"}','203.0.113.5')`);

  const r = await db.query(`select actor, section, action, detail, ip, at from audit_log limit 1`);
  c.eq("누가", r.rows[0]?.actor, "이은호");
  c.eq("어느 메뉴", r.rows[0]?.section, "vendors");
  c.eq("무엇을", r.rows[0]?.action, "delete");
  c.eq("삭제된 대상 이름이 남음", r.rows[0]?.detail?.name, "사라진거래처");
  c.ok("접속 IP 기록", r.rows[0]?.ip === "203.0.113.5");
  c.ok("시각 자동 기록", r.rows[0]?.at instanceof Date);

  // 핵심: 원본이 사라져도 이력은 남아야 한다
  const v = await db.query(`insert into vendors (name) values ('곧삭제될거래처') returning id`);
  const vid = v.rows[0].id;
  await db.exec(`
    insert into audit_log (actor, section, action, target_table, target_id, detail)
    values ('권순복','vendors','delete','vendors','${vid}','{"name":"곧삭제될거래처"}')`);
  await db.exec(`delete from vendors where id='${vid}'`);

  const left = await db.query(`select detail from audit_log where target_id='${vid}'`);
  c.eq("원본 삭제 후에도 이력이 남음", left.rows[0]?.detail?.name, "곧삭제될거래처");

  // 조회 성능용 인덱스
  const idx = await db.query(`select indexname from pg_indexes where tablename='audit_log'`);
  c.ok("조회용 인덱스 생성됨", idx.rows.length >= 4, `현재 ${idx.rows.length}개`);

  return c;
}
