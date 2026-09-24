/** RLS — 고객 정보가 익명에게 노출되지 않는지 (실질적 유일한 방어선) */
import { makeChecker } from "../harness.mjs";

export default async function run(db) {
  const c = makeChecker("RLS 접근 통제");

  const enabled = await db.query(`
    select relname from pg_class
    where relnamespace='public'::regnamespace and relkind='r' and relrowsecurity = true
    order by relname`);
  const on = enabled.rows.map((r) => r.relname);

  for (const t of ["inquiries", "schedules", "vendors", "equipment", "settlements", "audit_log"]) {
    c.ok(`${t} RLS 켜짐`, on.includes(t), `RLS 켜진 표: ${on.join(", ")}`);
  }

  // 공개돼야 하는 것 / 아닌 것
  const pol = await db.query(`
    select tablename, cmd from pg_policies where schemaname='public' order by tablename`);
  const byTable = {};
  for (const r of pol.rows) (byTable[r.tablename] = byTable[r.tablename] || []).push(r.cmd);

  c.ok("banners 공개 읽기 정책 있음", (byTable.banners || []).includes("SELECT"));
  c.ok("inquiries 는 INSERT 정책만 (읽기 정책 없음)",
    (byTable.inquiries || []).includes("INSERT") && !(byTable.inquiries || []).includes("SELECT"),
    `현재: ${(byTable.inquiries || []).join(",") || "없음"}`);
  c.ok("schedules 는 정책 없음 → service_role 전용", !byTable.schedules);
  c.ok("settlements 는 정책 없음 → service_role 전용", !byTable.settlements);
  c.ok("audit_log 는 정책 없음 → service_role 전용", !byTable.audit_log);

  return c;
}
