#!/usr/bin/env node
/**
 * 오픈 전 점검 — 아직 임시값인 항목과 실행하지 않은 SQL 을 알려준다.
 *
 * 개인정보처리방침은 법적 문서라 임시값 상태로 공개하면 안 된다.
 * 사람이 기억하는 대신 이 스크립트가 대신 확인한다.
 *
 *   npm run check
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// 파일에서 `키: "값"` 형태의 값을 읽는다 (정규식 없이 문자열 처리)
function valueOf(file, key) {
  const NL = String.fromCharCode(10);
  for (const raw of read(file).split(NL)) {
    const line = raw.trim();
    if (!line.startsWith(key + ":")) continue;
    const rest = line.slice(key.length + 1).trim();
    const q = rest[0];
    if (q !== '"' && q !== "'") continue;
    const close = rest.indexOf(q, 1);
    if (close < 0) continue;
    return rest.slice(1, close);
  }
  return null;
}

// 임시값으로 볼 패턴
const PLACEHOLDER_WORDS = ["추후", "담당자명", "홍길동", "0000", "테헤란로 00", "○○", "your_", "your-"];
const isPlaceholder = (v) =>
  v == null ||
  v.trim() === "" ||
  (v.startsWith("(") && v.endsWith(")")) ||
  PLACEHOLDER_WORDS.some((w) => v.includes(w));

const checks = [
  { 항목: "개인정보 보호책임자 이름", 파일: "lib/privacy.js",   값: valueOf("lib/privacy.js", "name") },
  { 항목: "보호책임자 직책",          파일: "lib/privacy.js",   값: valueOf("lib/privacy.js", "position") },
  { 항목: "대표자",                   파일: "lib/constants.js", 값: valueOf("lib/constants.js", "ceo") },
  { 항목: "사업장 주소",              파일: "lib/constants.js", 값: valueOf("lib/constants.js", "address") },
  { 항목: "대표 전화",                파일: "lib/constants.js", 값: valueOf("lib/constants.js", "phone") },
  { 항목: "대표 이메일",              파일: "lib/constants.js", 값: valueOf("lib/constants.js", "email") },
  { 항목: "입금 계좌",                파일: "lib/constants.js", 값: valueOf("lib/constants.js", "account") },
];

console.log("=== 오픈 전 점검 ===\n");

const 남음 = [];
console.log("[사업자·개인정보 표기]");
for (const c of checks) {
  const 임시 = isPlaceholder(c.값);
  if (임시) 남음.push(c);
  console.log(`  ${임시 ? "☐" : "☑"} ${c.항목.padEnd(22)} ${c.값 ?? "(못 읽음)"}`);
}

// 스키마 대조 결과를 이어붙인다
console.log("\n[스키마]");
let 스키마OK = true;
try {
  const out = execFileSync(process.execPath, [path.join(ROOT, "scripts", "check-schema.mjs")], {
    encoding: "utf8",
  });
  console.log(
    out.split("\n").filter((l) => l.trim() && !l.startsWith("===")).map((l) => "  " + l.trim()).join("\n")
  );
} catch (e) {
  스키마OK = false;
  const out = (e.stdout || "") + (e.stderr || "");
  console.log(
    out.split("\n").filter((l) => l.trim() && !l.startsWith("===")).map((l) => "  " + l.trim()).join("\n")
  );
}

console.log("\n" + "─".repeat(52));
if (남음.length === 0 && 스키마OK) {
  console.log("✅ 오픈 전 항목이 모두 채워졌습니다.");
} else {
  if (남음.length) {
    console.log(`⚠️  아직 임시값인 항목 ${남음.length}개 — 처리방침은 법적 문서입니다.`);
    for (const c of 남음) console.log(`    · ${c.항목}  (${c.파일})`);
  }
  if (!스키마OK) console.log("⚠️  실행하지 않은 SQL 이 있습니다 (supabase/migrations/).");
  process.exitCode = 1;
}
