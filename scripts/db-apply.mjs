#!/usr/bin/env node
/**
 * 마이그레이션을 실제 DB에 적용한다.
 *
 *   npm run db:apply            -- 어떤 SQL 이 적용될지 보여주기만 (기본)
 *   npm run db:apply -- --run   -- 실제 실행
 *
 * 두 가지 경로를 지원하며, .env.local 에 있는 것을 자동으로 고른다.
 *
 *   ① SUPABASE_DB_URL        (권장)
 *      해당 프로젝트의 DB 에만 접근. 범위가 좁아 안전하다.
 *      Supabase 대시보드 → Project Settings → Database → Connection string (URI)
 *
 *   ② SUPABASE_ACCESS_TOKEN  (계정 전체 권한)
 *      Management API 로 SQL 을 실행한다. 프로젝트 생성까지 가능하지만
 *      계정의 모든 프로젝트에 접근할 수 있어 위험 범위가 넓다.
 *
 * 안전장치
 *   - 기본은 미리보기. --run 을 줘야 실제로 실행한다.
 *   - 실행 전 자동으로 백업을 남긴다.
 *   - 실행 후 스키마를 대조해 결과를 보여준다.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const NL = String.fromCharCode(10);
const RUN = process.argv.includes("--run");

function env(key) {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return null;
  for (const raw of fs.readFileSync(p, "utf8").split(NL)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    if (line.slice(0, eq).trim() === key) {
      return line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

/** 아직 적용하지 않은 마이그레이션 파일 (통합본 제외) */
function pendingFiles() {
  const dir = path.join(ROOT, "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.startsWith("APPLY-ALL"))
    .sort()
    .map((f) => ({ name: f, sql: fs.readFileSync(path.join(dir, f), "utf8") }));
}

/** Management API 로 실행 (계정 토큰) */
async function runViaApi(token, projectRef, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** 직접 접속으로 실행 (DB 주소) */
async function runViaPg(dbUrl, sql) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function main() {
  const dbUrl = env("SUPABASE_DB_URL");
  const token = env("SUPABASE_ACCESS_TOKEN");
  const supaUrl = env("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  const ref = supaUrl.replace(/^https:\/\//, "").split(".")[0];

  const files = pendingFiles();
  console.log("적용 대상 마이그레이션");
  for (const f of files) console.log(`  · ${f.name}`);
  console.log("");

  if (!dbUrl && !token) {
    console.log("실행 수단이 없습니다. .env.local 에 아래 중 하나를 넣어주세요.");
    console.log("");
    console.log("  SUPABASE_DB_URL=postgresql://postgres:<비밀번호>@<호스트>:5432/postgres");
    console.log("    → 대시보드 Project Settings → Database → Connection string (URI)");
    console.log("    → 이 프로젝트의 DB 에만 접근. 권장.");
    console.log("");
    console.log("  SUPABASE_ACCESS_TOKEN=sbp_...");
    console.log("    → 대시보드 Account → Access Tokens");
    console.log("    → 계정 전체 권한. 프로젝트 생성까지 필요할 때만.");
    console.log("");
    console.log("  ※ .env.local 은 git 에 올라가지 않습니다. 채팅창에 붙여넣지 마세요.");
    process.exitCode = 1;
    return;
  }

  const how = dbUrl ? "DB 직접 접속 (SUPABASE_DB_URL)" : `Management API (프로젝트 ${ref})`;
  console.log(`실행 수단: ${how}`);

  if (!RUN) {
    console.log("");
    console.log("미리보기 모드입니다. 실제로 적용하려면:");
    console.log("  npm run db:apply -- --run");
    return;
  }

  // 되돌릴 수 있도록 먼저 백업
  console.log("");
  console.log("1) 적용 전 백업");
  try {
    execFileSync(process.execPath, [path.join(ROOT, "scripts", "backup-db.mjs")], { stdio: "inherit" });
  } catch {
    console.log("  ! 백업 실패 — 중단합니다. 백업 없이 스키마를 바꾸지 않습니다.");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("2) 마이그레이션 적용");
  for (const f of files) {
    try {
      if (dbUrl) await runViaPg(dbUrl, f.sql);
      else await runViaApi(token, ref, f.sql);
      console.log(`  ✓ ${f.name}`);
    } catch (e) {
      console.log(`  ✗ ${f.name}: ${String(e.message).slice(0, 160)}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log("");
  console.log("3) 스키마 대조");
  try {
    execFileSync(process.execPath, [path.join(ROOT, "scripts", "check-schema.mjs")], { stdio: "inherit" });
  } catch {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
