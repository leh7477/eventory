#!/usr/bin/env node
/**
 * 백업 복구 훈련
 *
 * 백업 파일이 있다고 복구되는 게 아니다. 실제로 되살려 봐야만
 *   · 파일이 깨지지 않았는지
 *   · 표 사이 연결(문의↔정산↔입금, 일정↔배정기기)이 유지되는지
 *   · 빠진 표가 없는지
 * 를 알 수 있다. 이 스크립트가 그걸 자동으로 확인한다.
 *
 * 운영 DB 는 건드리지 않는다. 메모리 Postgres(PGlite)에 복원해 검증하고
 * 끝나면 사라진다. 스모크 테스트와 같은 방식이다.
 *
 * 사용법
 *   node scripts/restore-drill.mjs                    # 가장 최근 백업
 *   node scripts/restore-drill.mjs 2026-10-07         # 날짜 지정
 *   BACKUP_DIR=/경로 node scripts/restore-drill.mjs
 *
 * ⚠️ 백업에는 고객 개인정보가 들어 있다. 백업이 있는 곳(서버)에서 직접
 *    돌리고, 파일을 다른 데로 옮기지 말 것.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { bootDb, applyMigrations, makeChecker, report } from "./smoke/harness.mjs";

const BACKUP_DIR =
  process.env.BACKUP_DIR || path.join(os.homedir(), "backups", "eventory");

/**
 * 넣는 순서 — 참조당하는 표가 먼저 와야 한다.
 * 여기 없는 표는 마지막에 넣는다(참조가 없다고 보고).
 */
const ORDER = [
  "categories",
  "vendors",
  "products",
  "product_images",
  "cases",
  "case_images",
  "inquiries",
  "settlements",
  "payments",
  "schedules",
  "schedule_items",
];

// Supabase 가 관리하는 표라 PGlite 로는 되살릴 수 없다 (구조가 다름)
const SKIP = new Set(["auth_users"]);

function pickBackup() {
  const arg = process.argv[2];
  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(`백업 폴더가 없습니다: ${BACKUP_DIR}`);
  }
  const days = fs
    .readdirSync(BACKUP_DIR)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (days.length === 0) throw new Error(`백업이 하나도 없습니다: ${BACKUP_DIR}`);
  const day = arg || days[days.length - 1];
  if (!days.includes(day)) {
    throw new Error(`그 날짜 백업이 없습니다: ${day}\n  있는 것: ${days.join(", ")}`);
  }
  return { day, dir: path.join(BACKUP_DIR, day) };
}

function readTable(dir, name) {
  const file = path.join(dir, `${name}.json.gz`);
  if (!fs.existsSync(file)) return null;
  const raw = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
  return JSON.parse(raw);
}

/** 한 행을 insert — 컬럼은 백업에 있는 것만 */
async function insertRow(db, table, row, cols) {
  const keys = Object.keys(row).filter((k) => cols.has(k));
  if (keys.length === 0) return;
  const params = keys.map((_, i) => `$${i + 1}`).join(", ");
  const names = keys.map((k) => `"${k}"`).join(", ");
  const values = keys.map((k) => {
    const v = row[k];
    // jsonb 컬럼은 객체로 오므로 문자열로 넘긴다
    return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  });
  await db.query(`insert into ${table} (${names}) values (${params})`, values);
}

async function main() {
  const { day, dir } = pickBackup();
  console.log("=== 백업 복구 훈련 ===");
  console.log("운영 DB 는 건드리지 않습니다. 메모리 Postgres 에 복원해 검증합니다.\n");
  console.log(`  백업: ${dir}`);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "_manifest.json"), "utf8")
  );
  console.log(`  시각: ${manifest.at}`);
  console.log(`  기록된 행: ${manifest.total}건\n`);

  const db = await bootDb();
  const applied = await applyMigrations(db);
  console.log(`  1) 빈 DB 준비 완료 (마이그레이션 ${applied.length}개)`);

  // 실제 표의 컬럼 목록 — 백업에 있지만 표에 없는 컬럼은 버린다
  const colRes = await db.query(`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public'`);
  const colsOf = new Map();
  for (const r of colRes.rows) {
    if (!colsOf.has(r.table_name)) colsOf.set(r.table_name, new Set());
    colsOf.get(r.table_name).add(r.column_name);
  }

  // 백업에 들어있는 표를 순서대로
  const inBackup = Object.keys(manifest.rows).filter((t) => !SKIP.has(t));
  const ordered = [
    ...ORDER.filter((t) => inBackup.includes(t)),
    ...inBackup.filter((t) => !ORDER.includes(t)),
  ];

  const c = makeChecker("복원");
  const restored = {};
  const problems = [];

  // 넣기 전에 비운다. 빈 DB 라도 schema.sql 과 마이그레이션이 기본 행을
  // 미리 넣어두는 표가 있어(settings, schema_migrations) 그대로 insert 하면
  // 키 충돌로 복구가 멈춘다. 백업이 원본이므로 덮어쓰는 게 맞다.
  // 참조하는 쪽(자식)부터 지워야 외래키에 걸리지 않는다.
  for (const table of [...ordered].reverse()) {
    if (!colsOf.has(table)) continue;
    await db.query(`delete from ${table}`);
  }

  for (const table of ordered) {
    const rows = readTable(dir, table);
    if (rows === null) {
      problems.push(`${table}: 파일이 없음`);
      continue;
    }
    const cols = colsOf.get(table);
    if (!cols) {
      problems.push(`${table}: 지금 스키마에 없는 표 (백업만 있음)`);
      continue;
    }
    let ok = 0;
    for (const row of rows) {
      try {
        await insertRow(db, table, row, cols);
        ok += 1;
      } catch (e) {
        problems.push(`${table}: ${String(e.message).slice(0, 110)}`);
        break; // 같은 오류가 줄줄이 나올 테니 표당 하나만
      }
    }
    restored[table] = ok;
  }
  console.log(`  2) 복원 완료\n`);

  /* ---------- 검증 ---------- */

  // 1. 행 수가 매니페스트와 같은가
  for (const table of ordered) {
    const want = manifest.rows[table] ?? 0;
    c.eq(`${table} 행 수`, restored[table] ?? 0, want);
  }

  // 2. 백업에 빠진 표가 없는가 — 지금 스키마의 표가 모두 들어있어야 한다
  const schemaTables = [...colsOf.keys()].filter(
    (t) => !t.startsWith("pg_") && t !== "schema_migrations"
  );
  const missing = schemaTables.filter(
    (t) => !(t in manifest.rows) && !SKIP.has(t)
  );
  c.ok(
    "백업에 빠진 표 없음",
    missing.length === 0,
    missing.length ? `빠짐: ${missing.join(", ")}` : ""
  );

  // 3. 표 사이 연결이 살아있는가 (여기가 핵심)
  const orphan = async (label, sql) => {
    const n = (await db.query(sql)).rows[0]?.n ?? 0;
    c.eq(label, Number(n), 0);
  };
  await orphan(
    "정산 → 문의 연결",
    `select count(*)::int as n from settlements s
     left join inquiries i on i.id = s.inquiry_id where i.id is null`
  );
  if (inBackup.includes("payments")) {
    await orphan(
      "입금 → 문의 연결",
      `select count(*)::int as n from payments p
       left join inquiries i on i.id = p.inquiry_id where i.id is null`
    );
  }
  await orphan(
    "배정기기 → 일정 연결",
    `select count(*)::int as n from schedule_items si
     left join schedules s on s.id = si.schedule_id where s.id is null`
  );
  await orphan(
    "장비 → 카테고리 연결",
    `select count(*)::int as n from products p
     where p.category_id is not null
       and not exists (select 1 from categories c where c.id = p.category_id)`
  );

  // 4. 금액이 보존됐는가 — 숫자가 틀리면 복구해도 소용없다
  const money = await db.query(`
    select coalesce(sum(contract_amount), 0)::bigint as contract,
           coalesce(sum(paid_amount), 0)::bigint     as paid
    from settlements`);
  console.log(
    `\n  복원된 금액: 계약 ₩${Number(money.rows[0].contract).toLocaleString("ko-KR")}` +
      ` / 실입금 ₩${Number(money.rows[0].paid).toLocaleString("ko-KR")}`
  );

  if (problems.length) {
    console.log("\n  ⚠️ 복원 중 생긴 문제");
    for (const p of problems) console.log(`     · ${p}`);
  }

  const ok = report([c]); // 전부 통과하면 true
  console.log(
    ok
      ? "\n이 백업으로 되살릴 수 있습니다."
      : "\n복구 훈련 실패 — 위 항목을 먼저 해결해야 실제 사고 때 되살릴 수 있습니다."
  );
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("\n복구 훈련 중단:", e.message);
  process.exit(1);
});
