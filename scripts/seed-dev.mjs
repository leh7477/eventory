#!/usr/bin/env node
/**
 * 개발용 Supabase 프로젝트에 가짜 데이터를 채운다.
 *
 * 왜 가짜 데이터인가
 *   운영 DB의 고객 정보를 개발 환경으로 복사하면 그 자체가 개인정보 유출 경로가
 *   된다. 개발 환경은 백업·접근통제 수준이 낮고 화면에 그대로 뜬다.
 *   그래서 구조만 같고 내용은 지어낸 값으로 채운다.
 *
 * 사전 준비
 *   1) Supabase 에서 개발용 프로젝트를 새로 만든다 (무료 2개까지)
 *   2) 그 프로젝트 SQL Editor 에 supabase/schema.sql 전체를 실행한다
 *   3) .env.development.local 에 새 프로젝트 키를 적는다
 *        NEXT_PUBLIC_SUPABASE_URL=...
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *
 * 실행
 *   node scripts/seed-dev.mjs
 *
 * 안전장치
 *   운영 DB 주소가 감지되면 실행을 거부한다.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const NL = String.fromCharCode(10);

function readEnv(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  const out = {};
  for (const raw of fs.readFileSync(p, "utf8").split(NL)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const dev = readEnv(".env.development.local");
const prod = readEnv(".env.local");

if (!dev) {
  console.error("  .env.development.local 이 없습니다.");
  console.error("  개발용 Supabase 프로젝트를 만든 뒤 그 키로 파일을 만들어주세요.");
  console.error("  (파일 맨 위 주석의 '사전 준비' 참고)");
  process.exit(1);
}

// 안전장치 — 운영 DB 로는 절대 실행하지 않는다
if (prod && dev.NEXT_PUBLIC_SUPABASE_URL === prod.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("  중단: 개발용 주소가 운영 DB와 같습니다.");
  console.error("  운영 데이터를 덮어쓸 뻔했습니다. .env.development.local 을 확인하세요.");
  process.exit(1);
}

const db = createClient(dev.NEXT_PUBLIC_SUPABASE_URL, dev.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── 가짜 데이터 ────────────────────────────────────────────────
const CATEGORIES = ["가챠머신", "에어볼추첨기", "스톱워치", "룰렛", "사격게임", "핀볼게임"];
const 업체 = ["가나다컴퍼니", "라마바기획", "사아자이벤트", "차카타커뮤니케이션", "파하기획"];
const 담당 = ["김하나", "이두리", "박세찬", "최나연", "정우진"];
const 장소 = [
  "서울 중구 세종대로 110",
  "부산 해운대구 센텀중앙로 55",
  "경기 고양시 일산서구 킨텍스로 217",
  "대전 유성구 엑스포로 107",
];

const pad = (n) => String(n).padStart(2, "0");
const 오늘 = new Date();
const 날짜 = (더함) => {
  const d = new Date(오늘.getTime() + 더함 * 86400_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const 전화 = (i) => `010-${pad(10 + i)}00-${pad(20 + i)}00`;

async function main() {
  console.log("개발 DB:", dev.NEXT_PUBLIC_SUPABASE_URL);
  console.log("");

  // 기존 내용을 비운다 (개발 DB 전용이므로 안전)
  for (const t of ["schedule_items", "schedules", "settlements", "inquiries",
                   "equipment", "vendors", "rental_rates", "shipping_rates",
                   "case_images", "cases", "product_images", "products", "banners", "categories"]) {
    const r = await db.from(t).delete().not("id", "is", null);
    if (r.error && !/does not exist|schema cache/i.test(r.error.message)) {
      console.log(`  ! ${t}: ${r.error.message}`);
    }
  }

  const count = {};
  const put = async (table, rows) => {
    const { data, error } = await db.from(table).insert(rows).select("id");
    if (error) { console.log(`  ! ${table}: ${error.message}`); return []; }
    count[table] = data.length;
    return data;
  };

  // 종류 · 기기
  await put("categories", CATEGORIES.map((name, i) => ({ name, order_num: i + 1 })));
  await put("equipment", CATEGORIES.flatMap((cat) =>
    Array.from({ length: 3 }, (_, i) => ({ name: `${cat}${i + 1}`, category: cat, active: true }))
  ));

  // 거래처
  await put("vendors", [
    { name: "가나다인쇄", contact: "김인쇄", phone: "02-000-0001" },
    { name: "라마바디자인", contact: "이디자인", phone: "02-000-0002" },
  ]);

  // 단가
  await put("shipping_rates", [
    { region: "서울", quick_fee: 30000, direct_fee: 50000, sort: 1 },
    { region: "경기", quick_fee: 40000, direct_fee: 60000, sort: 2 },
    { region: "부산", quick_fee: 90000, direct_fee: 150000, sort: 3 },
  ]);
  await put("rental_rates", CATEGORIES.slice(0, 4).map((product, i) => ({
    product,
    prices: Array.from({ length: 14 }, (_, d) => 100000 + i * 20000 + d * 10000),
    made_price: 500000 + i * 100000,
    sort: i + 1,
  })));

  // 문의 (전부 지어낸 값)
  const inq = await put("inquiries", Array.from({ length: 8 }, (_, i) => ({
    company_name: 업체[i % 업체.length],
    contact_name: 담당[i % 담당.length],
    phone: 전화(i),
    email: `sample${i + 1}@example.com`,
    product: CATEGORIES[i % CATEGORIES.length],
    usage: i % 3 === 0 ? "제작" : "임대",
    event_start: 날짜(i * 3 - 6),
    event_end: 날짜(i * 3 - 4),
    address: 장소[i % 장소.length],
    address_detail: `${i + 1}층 행사장`,
    message: "개발용 예시 문의입니다.",
    status: ["new", "consulting", "quoted", "confirmed", "done"][i % 5],
    contract_amount: i % 2 === 0 ? 1000000 + i * 200000 : null,
    paid_amount: i % 4 === 0 ? 1000000 + i * 200000 : null,
    is_read: i % 2 === 0,
  })));

  // 일정
  if (inq.length) {
    const sch = await put("schedules", inq.slice(0, 5).map((q, i) => ({
      title: `${업체[i % 업체.length]} · ${CATEGORIES[i % CATEGORIES.length]}`,
      start_date: 날짜(i * 3 - 6),
      end_date: 날짜(i * 3 - 4),
      event_start: 날짜(i * 3 - 6),
      event_end: 날짜(i * 3 - 4),
      location: 장소[i % 장소.length],
      client_manager: 담당[i % 담당.length],
      client_phone: 전화(i),
      inquiry_id: q.id,
      stage: i % 5,
      vendor: i % 2 === 0 ? "가나다인쇄" : "라마바디자인",
      memo: i % 3 === 0 ? "용도: 제작" : "용도: 임대",
    })));
    if (sch.length) {
      await put("schedule_items", sch.map((s, i) => ({
        schedule_id: s.id,
        category: CATEGORIES[i % CATEGORIES.length],
        quantity: (i % 3) + 1,
      })));
    }
  }

  // 사이트 설정
  await db.from("settings").upsert({ id: 1 });

  console.log("채운 내용");
  for (const [t, n] of Object.entries(count)) console.log(`  ${t.padEnd(16)} ${n}건`);
  console.log("");
  console.log("관리자 계정은 아래처럼 따로 만들어주세요 (개발용 비밀번호):");
  console.log("  Supabase 대시보드 → Authentication → Add user");
  console.log("  이메일 <아이디>@eventory.local / user_metadata 에 {\"role\":\"owner\"}");
}

main().catch((e) => {
  console.error("실패:", e.message);
  process.exit(1);
});
