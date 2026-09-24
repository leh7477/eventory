/**
 * 스모크 테스트 공용 기반
 *
 * 운영 DB(Supabase/PostgreSQL)를 건드리지 않고, 메모리 위에 진짜 Postgres 를
 * 띄워 스키마와 마이그레이션을 검증한다.
 *
 * 왜 PGlite 인가 (Apache-2.0)
 *   운영이 PostgreSQL 이므로 검증도 PostgreSQL 이어야 한다.
 *   SQLite 로는 이 스키마를 돌릴 수 없다 — 실제로 시험한 결과
 *   117개 문장 중 2개만 통과했다(jsonb, uuid, timestamptz, RLS,
 *   do $$ 블록 등이 전부 Postgres 전용).
 *   방언이 다른 DB로 검증하면 '통과했는데 운영에서 깨지는' 최악이 된다.
 */
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const NL = String.fromCharCode(10);
export const ROOT = path.resolve(import.meta.dirname, "..", "..");

/** 새 Postgres 를 띄우고 schema.sql 을 적용한다 */
export async function bootDb() {
  const db = await PGlite.create();

  // Supabase 의 역할은 로컬에 없으므로 만들어 둔다 (RLS 정책 생성에 필요)
  for (const r of ["anon", "authenticated", "service_role"]) {
    try { await db.exec(`create role ${r};`); } catch { /* 이미 있으면 무시 */ }
  }

  let sql = fs.readFileSync(path.join(ROOT, "supabase", "schema.sql"), "utf8");
  // pgcrypto 는 PGlite 에 없지만 gen_random_uuid() 는 PG13+ 내장이라 불필요
  sql = sql.replace(/create extension if not exists pgcrypto;/i, "");
  await db.exec(sql);
  return db;
}

/** migrations/*.sql 을 날짜순으로 적용한다 (APPLY-ALL 통합본은 중복이므로 제외) */
export async function applyMigrations(db) {
  const dir = path.join(ROOT, "supabase", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.startsWith("APPLY-ALL"))
    .sort();

  const applied = [];
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    try {
      await db.exec(sql);
      applied.push(f);
    } catch (e) {
      throw new Error(`마이그레이션 실패 [${f}]: ${e.message}`);
    }
  }
  return applied;
}

/** 통합본(APPLY-ALL)이 개별 파일과 같은 결과를 내는지 확인할 때 쓴다 */
export async function applyCombined(db) {
  const dir = path.join(ROOT, "supabase", "migrations");
  const f = fs.readdirSync(dir).find((x) => x.startsWith("APPLY-ALL"));
  if (!f) throw new Error("APPLY-ALL 파일을 찾을 수 없습니다");
  await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
  return f;
}

// ── 검사 도구 ───────────────────────────────────────────────
export function makeChecker(name) {
  const results = [];
  return {
    name,
    results,
    /** 참이어야 하는 조건 */
    ok(label, cond, detail) {
      results.push({ label, pass: !!cond, detail: cond ? null : detail ?? "" });
    },
    /** 두 값이 같아야 하는 조건 */
    eq(label, got, want) {
      const pass = JSON.stringify(got) === JSON.stringify(want);
      results.push({ label, pass, detail: pass ? null : `기대 ${JSON.stringify(want)} / 실제 ${JSON.stringify(got)}` });
    },
    /** 반드시 실패해야 하는 SQL (제약이 실제로 막는지 확인) */
    async rejects(label, db, sql) {
      try {
        await db.exec(sql);
        results.push({ label, pass: false, detail: "막혔어야 하는데 통과함" });
      } catch {
        results.push({ label, pass: true, detail: null });
      }
    },
    /** 성공해야 하는 SQL */
    async accepts(label, db, sql) {
      try {
        await db.exec(sql);
        results.push({ label, pass: true, detail: null });
      } catch (e) {
        results.push({ label, pass: false, detail: e.message.slice(0, 80) });
      }
    },
  };
}

export function report(checkers) {
  let pass = 0, fail = 0;
  for (const c of checkers) {
    const bad = c.results.filter((r) => !r.pass);
    const mark = bad.length ? "✗" : "✓";
    console.log(`${NL}${mark} ${c.name}  (${c.results.length - bad.length}/${c.results.length})`);
    for (const r of c.results) {
      if (r.pass) { pass++; console.log(`    · ${r.label}`); }
      else { fail++; console.log(`    ! ${r.label}${r.detail ? "  → " + r.detail : ""}`); }
    }
  }
  console.log(NL + "─".repeat(58));
  console.log(fail === 0 ? `모두 통과 (${pass}건)` : `실패 ${fail}건 / 통과 ${pass}건`);
  return fail === 0;
}
