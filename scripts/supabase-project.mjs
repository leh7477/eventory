#!/usr/bin/env node
/**
 * 개발용 Supabase 프로젝트 만들기
 *
 *   npm run db:project              -- 계정 정보와 만들 내용을 보여주기만 (기본)
 *   npm run db:project -- --run     -- 실제로 생성
 *
 * 필요한 것: .env.local 의 SUPABASE_ACCESS_TOKEN (계정 토큰)
 *   대시보드 → Account → Access Tokens 에서 발급
 *
 * 만든 뒤 순서
 *   1) 새 프로젝트가 준비되면(1~2분) 키를 .env.development.local 에 적는다
 *   2) schema.sql 을 새 프로젝트에 적용     npm run db:apply (개발용 설정으로)
 *   3) 가짜 데이터 채우기                    npm run seed:dev
 *
 * 주의
 *   무료 플랜은 조직당 프로젝트 2개까지다. 이미 2개면 생성이 거부된다.
 *   운영 데이터를 개발 프로젝트로 복사하지 않는다 (개인정보 유출 경로).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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
    if (eq > 0 && line.slice(0, eq).trim() === key) {
      return line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

async function api(token, pathname, init = {}) {
  const res = await fetch(`https://api.supabase.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 250)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const token = env("SUPABASE_ACCESS_TOKEN");
  if (!token) {
    console.log("SUPABASE_ACCESS_TOKEN 이 .env.local 에 없습니다.");
    console.log("  대시보드 → Account → Access Tokens 에서 발급 후 추가하세요.");
    console.log("  ※ 채팅창에 붙여넣지 마세요. .env.local 은 git 에 올라가지 않습니다.");
    process.exitCode = 1;
    return;
  }

  const orgs = await api(token, "/v1/organizations");
  const projects = await api(token, "/v1/projects");

  console.log("계정 현황");
  for (const o of orgs) {
    const mine = projects.filter((p) => p.organization_id === o.id);
    console.log(`  조직 ${o.name} (${o.id}) — 프로젝트 ${mine.length}개`);
    for (const p of mine) console.log(`      · ${p.name}  [${p.region}]  ${p.status}`);
  }

  const org = orgs[0];
  const prodRef = (env("NEXT_PUBLIC_SUPABASE_URL") ?? "").replace(/^https:\/\//, "").split(".")[0];
  const prod = projects.find((p) => p.id === prodRef);
  const region = prod?.region ?? "ap-northeast-2";

  const plan = {
    name: "eventland-dev",
    organization_id: org?.id,
    region,                       // 운영과 같은 지역에 둔다 (동작 차이를 줄이기 위해)
    plan: "free",
  };

  console.log("");
  console.log("만들 프로젝트");
  console.log(`  이름   ${plan.name}`);
  console.log(`  조직   ${org?.name}`);
  console.log(`  지역   ${plan.region}${prod ? "  (운영과 동일)" : ""}`);
  console.log(`  플랜   무료`);

  if (!RUN) {
    console.log("");
    console.log("미리보기 모드입니다. 실제로 만들려면:");
    console.log("  npm run db:project -- --run");
    return;
  }

  // DB 비밀번호는 여기서 만들어 파일로 남긴다 (화면에 길게 흘리지 않는다)
  const dbPass = crypto.randomBytes(24).toString("base64url");

  console.log("");
  console.log("생성 중...");
  const created = await api(token, "/v1/projects", {
    method: "POST",
    body: JSON.stringify({ ...plan, db_pass: dbPass }),
  });

  const out = path.join(ROOT, ".env.development.local");
  const lines = [
    "# 개발용 Supabase — scripts/supabase-project.mjs 가 생성",
    "# 이 파일은 git 에 올라가지 않습니다 (.gitignore: .env*.local)",
    `NEXT_PUBLIC_SUPABASE_URL=https://${created.id}.supabase.co`,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
    "SUPABASE_SERVICE_ROLE_KEY=",
    `SUPABASE_DB_URL=postgresql://postgres:${dbPass}@db.${created.id}.supabase.co:5432/postgres`,
    "",
  ].join(NL);
  fs.writeFileSync(out, lines, { mode: 0o600 });

  console.log(`  ✓ 생성됨: ${created.name} (${created.id})`);
  console.log(`  ✓ 접속 정보를 .env.development.local 에 저장했습니다`);
  console.log("");
  console.log("다음 (프로젝트가 준비되기까지 1~2분 걸립니다)");
  console.log("  1) 대시보드에서 새 프로젝트의 anon / service_role 키를 복사해");
  console.log("     .env.development.local 의 빈 칸에 채웁니다");
  console.log("  2) 스키마 적용 후 가짜 데이터 채우기");
  console.log("       npm run seed:dev");
}

main().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
