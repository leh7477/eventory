#!/usr/bin/env node
/**
 * 스키마 대조 — supabase/schema.sql 의 선언과 실제 DB를 비교한다.
 *
 * 왜 필요한가
 *   SQL 파일로 스키마를 관리해도, 그 파일이 실제 DB와 같은지는 아무도 보증하지
 *   않는다. 대시보드에서 손으로 바꾸거나 마이그레이션 실행을 빠뜨리면 조용히
 *   어긋나고, "컬럼이 없다" 오류로 화면이 죽고 나서야 알게 된다.
 *
 * 사용법
 *   node scripts/check-schema.mjs
 *   종료코드 0 = 일치, 1 = 어긋남 (배포 전 검사에 쓸 수 있음)
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");

function env(key) {
  const text = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) throw new Error(`${key} 를 .env.local 에서 찾을 수 없습니다`);
  return m[1].trim().replace(/^["']|["']$/g, "");
}

/** schema.sql + migrations/*.sql 을 읽어 { 테이블: Set<컬럼> } 으로 만든다 */
function declared() {
  const files = [path.join(ROOT, "supabase", "schema.sql")];
  const migDir = path.join(ROOT, "supabase", "migrations");
  if (fs.existsSync(migDir)) {
    for (const f of fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort()) {
      files.push(path.join(migDir, f));
    }
  }

  const tables = new Map();
  for (const file of files) {
    const sql = fs.readFileSync(file, "utf8");

    // create table if not exists <이름> ( ...컬럼... );
    for (const m of sql.matchAll(/create table if not exists\s+(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
      const [, name, body] = m;
      if (!tables.has(name)) tables.set(name, new Set());
      const cols = tables.get(name);
      for (const line of body.split("\n")) {
        const t = line.trim();
        // 제약조건 줄은 건너뛴다
        if (!t || t.startsWith("--") || /^(primary|unique|foreign|constraint|check)\b/i.test(t)) continue;
        const cm = t.match(/^(\w+)\s+/);
        if (cm) cols.add(cm[1]);
      }
    }

    // alter table <이름> add column if not exists <컬럼>
    for (const m of sql.matchAll(/alter table\s+(\w+)\s+add column if not exists\s+(\w+)/gi)) {
      const [, name, col] = m;
      if (!tables.has(name)) tables.set(name, new Set());
      tables.get(name).add(col);
    }
  }
  return tables;
}

async function main() {
  const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const spec = declared();
  const missingTables = [];
  const missingCols = [];
  let okTables = 0;
  let okCols = 0;

  for (const [table, cols] of [...spec].sort()) {
    // 테이블 존재 확인
    const probe = await db.from(table).select("*").limit(0);
    if (probe.error) {
      missingTables.push({ table, reason: probe.error.message.split(".")[0] });
      continue;
    }
    okTables++;

    // 컬럼은 한 번에 조회해서 어긋나면 하나씩 좁힌다
    const all = await db.from(table).select([...cols].join(",")).limit(0);
    if (!all.error) {
      okCols += cols.size;
      continue;
    }
    for (const c of cols) {
      const one = await db.from(table).select(c).limit(0);
      if (one.error) missingCols.push({ table, column: c });
      else okCols++;
    }
  }

  console.log("=== 스키마 대조 (선언 vs 실제 DB) ===");
  console.log(`  선언된 테이블 ${spec.size}개 / 실제 확인 ${okTables}개`);
  console.log(`  확인된 컬럼 ${okCols}개`);

  if (missingTables.length) {
    console.log("\n  [없는 테이블]");
    for (const m of missingTables) console.log(`    - ${m.table}`);
  }
  if (missingCols.length) {
    console.log("\n  [없는 컬럼]");
    for (const m of missingCols) console.log(`    - ${m.table}.${m.column}`);
  }

  if (!missingTables.length && !missingCols.length) {
    console.log("\n  ✅ 파일과 DB가 일치합니다.");
    return;
  }
  console.log("\n  ⚠️  아직 실행하지 않은 SQL 이 있습니다.");
  console.log("     supabase/migrations/ 의 파일을 Supabase SQL Editor 에서 실행하세요.");
  process.exitCode = 1;
}

main().catch((e) => {
  console.error("대조 실패:", e.message);
  process.exit(1);
});
