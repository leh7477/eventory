#!/usr/bin/env node
/**
 * 이벤트랜드 DB 백업
 *
 * Supabase 대시보드의 DB 비밀번호 없이, service_role 키만으로 전체 테이블을
 * JSON 으로 내려받는다. (pg_dump 를 쓰려면 DB 비밀번호가 별도로 필요함)
 *
 * 사용법
 *   node scripts/backup-db.mjs              # 기본 위치(~/backups/eventory)에 저장
 *   BACKUP_DIR=/경로 node scripts/backup-db.mjs
 *
 * 보관 정책: KEEP_DAYS(기본 30일)보다 오래된 백업 폴더는 자동 삭제.
 *
 * ⚠️ 이 백업에는 고객 개인정보가 들어 있다. 백업 폴더 권한을 700으로 유지하고
 *    외부로 옮길 때는 반드시 암호화할 것.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 30);
const BACKUP_DIR =
  process.env.BACKUP_DIR || path.join(os.homedir(), "backups", "eventory");

// .env.local 에서 키 읽기
function env(key) {
  const file = path.join(ROOT, ".env.local");
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) throw new Error(`${key} 를 .env.local 에서 찾을 수 없습니다`);
  return m[1].trim().replace(/^["']|["']$/g, "");
}

// schema.sql 에서 테이블 이름을 읽어온다 (새 테이블이 생겨도 자동 반영)
function tableNames() {
  const sql = fs.readFileSync(path.join(ROOT, "supabase", "schema.sql"), "utf8");
  const found = [...sql.matchAll(/create table if not exists\s+(\w+)/gi)].map(
    (m) => m[1]
  );
  return [...new Set(found)].sort();
}

function log(...a) {
  console.log(new Date().toISOString().slice(0, 19).replace("T", " "), ...a);
}

async function main() {
  const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = path.join(BACKUP_DIR, stamp);
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });

  const summary = {};
  let failed = 0;

  for (const t of tableNames()) {
    // 1000행씩 나눠서 전부 받기 (PostgREST 기본 상한 회피)
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from(t).select("*").range(from, from + 999);
      if (error) {
        log(`  ! ${t}: ${error.message}`);
        failed++;
        break;
      }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    const gz = zlib.gzipSync(JSON.stringify(rows));
    fs.writeFileSync(path.join(outDir, `${t}.json.gz`), gz, { mode: 0o600 });
    summary[t] = rows.length;
  }

  // 관리자 계정 목록 (비밀번호는 포함되지 않음 — 복구 시 재설정 필요)
  try {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    const users = (data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      user_metadata: u.user_metadata,
      created_at: u.created_at,
    }));
    fs.writeFileSync(
      path.join(outDir, "auth_users.json.gz"),
      zlib.gzipSync(JSON.stringify(users)),
      { mode: 0o600 }
    );
    summary["auth_users"] = users.length;
  } catch (e) {
    log("  ! 계정 목록 백업 실패:", e.message);
    failed++;
  }

  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  fs.writeFileSync(
    path.join(outDir, "_manifest.json"),
    JSON.stringify({ at: new Date().toISOString(), rows: summary, total }, null, 2)
  );

  log(`백업 완료 → ${outDir}`);
  log(`  테이블 ${Object.keys(summary).length}개 / 총 ${total}행` + (failed ? ` / 실패 ${failed}건` : ""));

  // 오래된 백업 정리
  const cutoff = Date.now() - KEEP_DAYS * 86400_000;
  let removed = 0;
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    const p = path.join(BACKUP_DIR, name);
    if (!fs.statSync(p).isDirectory()) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue;
    if (new Date(name).getTime() < cutoff) {
      fs.rmSync(p, { recursive: true, force: true });
      removed++;
    }
  }
  if (removed) log(`  ${KEEP_DAYS}일 지난 백업 ${removed}개 삭제`);

  if (failed) process.exit(1);
}

main().catch((e) => {
  log("백업 실패:", e.message);
  process.exit(1);
});
