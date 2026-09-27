#!/usr/bin/env node
/**
 * migrations/*.sql 을 순서대로 묶어 통합본을 만든다.
 *
 *   npm run build:sql
 *
 * 손으로 만들면 마이그레이션이 늘 때마다 낡는다. 실제로 한 번 낡아서
 * 스모크 테스트가 잡았다. 이제 파일이 늘면 다시 돌리기만 하면 된다.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const NL = String.fromCharCode(10);
const DIR = path.join(ROOT, "supabase", "migrations");
const OUT = path.join(DIR, "APPLY-ALL.sql");

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql") && !f.startsWith("APPLY-ALL")).sort();

// 파일 첫머리 주석에서 한 줄 설명을 뽑는다
function titleOf(sql) {
  for (const raw of sql.split(NL)) {
    const l = raw.trim();
    if (l.startsWith("--") && l.replace(/^-+/, "").trim()) return l.replace(/^-+/, "").trim();
  }
  return "";
}

let out = [
  "-- =====================================================================",
  "--  이벤트랜드 — 스키마 변경 통합본",
  `--  자동 생성: npm run build:sql  (${new Date().toISOString().slice(0, 10)})`,
  "--",
  "--  사용법",
  "--    1) Supabase 대시보드 → SQL Editor",
  "--    2) 이 파일 전체를 붙여넣고 Run",
  "--    3) 끝나면 로컬에서  npm run check:schema",
  "--",
  "--  모두 여러 번 실행해도 안전하다.",
  "-- =====================================================================",
  "",
].join(NL);

files.forEach((f, i) => {
  const sql = fs.readFileSync(path.join(DIR, f), "utf8");
  out += NL + `-- ─────────────────────────────────────────────────────────────────` + NL;
  out += `--  ${String(i + 1).padStart(2)}. ${titleOf(sql)}` + NL;
  out += `--      (${f})` + NL;
  out += `-- ─────────────────────────────────────────────────────────────────` + NL + NL;
  out += sql.trimEnd() + NL;
});

out += NL + [
  "-- =====================================================================",
  "--  끝. 로컬에서  npm run check:schema  로 확인하세요.",
  "-- =====================================================================",
].join(NL) + NL;

fs.writeFileSync(OUT, out);
// 날짜가 박힌 옛 통합본은 정리한다 (내용이 낡아 혼동을 부른다)
for (const f of fs.readdirSync(DIR)) {
  if (f.startsWith("APPLY-ALL-")) fs.unlinkSync(path.join(DIR, f));
}
console.log(`APPLY-ALL.sql 생성 — 마이그레이션 ${files.length}개 / ${out.split(NL).length}줄`);
files.forEach((f) => console.log(`  · ${f}`));
