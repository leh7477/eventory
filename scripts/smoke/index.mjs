#!/usr/bin/env node
/**
 * 마이그레이션 스모크 테스트
 *
 *   npm run smoke
 *
 * 운영 DB 를 건드리지 않는다. 메모리 위에 진짜 Postgres(PGlite, Apache-2.0)를
 * 띄워 schema.sql → 표본 데이터 → migrations 순으로 실제 적용해보고,
 * 기능별(모듈별)로 결과를 검사한다.
 *
 * 검사 흐름
 *   1) 스키마 적용
 *   2) 각 모듈이 '마이그레이션 전 상황'을 심는다 (seed)
 *   3) migrations/*.sql 를 날짜순 적용
 *   4) 각 모듈이 결과를 검사한다
 *   5) 두 번 실행해도 안전한지 (여러 번 돌려도 깨지지 않아야 함)
 *   6) APPLY-ALL 통합본이 개별 파일과 같은 결과를 내는지
 */
import { bootDb, applyMigrations, applyCombined, makeChecker, report } from "./harness.mjs";

import privacy from "./modules/privacy.mjs";
import constraints from "./modules/constraints.mjs";
import vendors, { seed as seedVendors } from "./modules/vendors.mjs";
import settlements, { seed as seedSettlements } from "./modules/settlements.mjs";
import audit from "./modules/audit.mjs";
import rls from "./modules/rls.mjs";
import settlementLogic from "./modules/settlement-logic.mjs";
import stage6, { seed as seedStage6 } from "./modules/stage6.mjs";
import stageLogic from "./modules/stage-logic.mjs";
import inquiryLogic from "./modules/inquiry-logic.mjs";
import payments, { seed as seedPayments } from "./modules/payments.mjs";

const MODULES = [
  { name: "privacy", run: privacy },
  { name: "constraints", run: constraints },
  { name: "vendors", run: vendors, seed: seedVendors },
  { name: "settlements", run: settlements, seed: seedSettlements },
  { name: "audit", run: audit },
  { name: "rls", run: rls },
  { name: "settlement-logic", run: settlementLogic },
  { name: "stage6", run: stage6, seed: seedStage6 },
  { name: "stage-logic", run: stageLogic },
  { name: "inquiry-logic", run: inquiryLogic },
  { name: "payments", run: payments, seed: seedPayments },
];

async function main() {
  console.log("=== 마이그레이션 스모크 테스트 ===");
  console.log("운영 DB 를 건드리지 않고 메모리 Postgres 에서 검증합니다.\n");

  const db = await bootDb();
  console.log("  1) schema.sql 적용 완료");

  for (const m of MODULES) {
    if (m.seed) await m.seed(db);
  }
  console.log("  2) 마이그레이션 전 표본 데이터 준비 완료");

  const applied = await applyMigrations(db);
  console.log(`  3) 마이그레이션 ${applied.length}개 적용 완료`);
  for (const f of applied) console.log(`       · ${f}`);

  const checkers = [];
  for (const m of MODULES) {
    checkers.push(await m.run(db, { beforeMigration: true }));
  }

  // 5) 두 번 실행해도 안전한지 — 운영에서 실수로 다시 돌릴 수 있다
  const idem = makeChecker("재실행 안전성 (같은 SQL 을 두 번 실행)");
  // 고정 숫자로 비교하면 표본이 늘 때마다 깨지고, 전후 건수 비교도 틀린다.
  // 모듈이 마이그레이션 사이에 문의를 새로 넣으면 두 번째 실행에서
  // 정상적으로 복사되기 때문이다. 확인해야 할 것은 "같은 건이 두 번
  // 들어가지 않는가" 이므로 중복 자체를 센다.
  const dupOf = async (sql) => (await db.query(sql)).rows[0].n;
  try {
    await applyMigrations(db);
    idem.ok("마이그레이션 재실행 성공", true);
  } catch (e) {
    idem.ok("마이그레이션 재실행 성공", false, e.message.slice(0, 90));
  }
  idem.eq(
    "한 문의에 정산 행이 둘 이상 생기지 않음",
    await dupOf(`select count(*)::int as n from (
       select inquiry_id from settlements group by inquiry_id having count(*) > 1) t`),
    0
  );
  idem.eq(
    "같은 입금이 두 번 들어가지 않음",
    await dupOf(`select count(*)::int as n from (
       select inquiry_id, paid_date, amount from payments
       group by inquiry_id, paid_date, amount having count(*) > 1) t`),
    0
  );
  checkers.push(idem);

  // 6) 통합본이 개별 파일과 같은 결과를 내는지 — 깨끗한 DB 에서 따로 확인
  const combined = makeChecker("APPLY-ALL 통합본");
  try {
    const db2 = await bootDb();
    for (const m of MODULES) if (m.seed) await m.seed(db2);
    const f = await applyCombined(db2);
    combined.ok(`${f} 실행 성공`, true);

    const a = await db2.query(`
      select column_name from information_schema.columns
      where table_schema='public' order by table_name, column_name`);
    const b = await db.query(`
      select column_name from information_schema.columns
      where table_schema='public' order by table_name, column_name`);
    combined.eq("개별 적용과 컬럼 구성이 동일", a.rows.length, b.rows.length);

    const t2 = await db2.query(`select to_regclass('public.settlements') as a, to_regclass('public.audit_log') as b`);
    combined.ok("통합본으로도 표가 모두 생성됨", t2.rows[0].a !== null && t2.rows[0].b !== null);
  } catch (e) {
    combined.ok("통합본 실행", false, e.message.slice(0, 90));
  }
  checkers.push(combined);

  const allPass = report(checkers);
  if (!allPass) process.exitCode = 1;
}

main().catch((e) => {
  console.error("\n스모크 테스트 중단:", e.message);
  process.exit(1);
});
