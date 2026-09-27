/**
 * 단계 4개 → 6개 확장 — 기존 기록이 올바른 의미로 옮겨지는지
 *
 * 이 검사가 중요한 이유
 *   stage_dates 는 키가 단계 '번호'다. 번호만 밀고 기록을 안 옮기면
 *   "9/14 발주함" 이 "AI파일 받음"으로 읽힌다. 눈으로는 멀쩡해 보이므로
 *   반드시 기계로 확인해야 한다.
 */
import { makeChecker } from "../harness.mjs";

// 옛 번호 → 새 번호
const MAP = { 1: 2, 2: 4, 3: 5, 4: 6 };

export default async function run(db) {
  const c = makeChecker("단계 6개 확장 (기록 재매핑)");

  const rows = await db.query(`select title, stage, stage_dates, stage_by from schedules where title like '스모크단계%' order by title`);
  const by = Object.fromEntries(rows.rows.map((r) => [r.title, r]));

  // 1) 단계 번호가 규칙대로 옮겨졌는가
  c.eq("0단계는 그대로 0", by["스모크단계_0_시작전"]?.stage, 0);
  c.eq("옛 1(발주) → 새 2(발주)", by["스모크단계_1_발주"]?.stage, MAP[1]);
  c.eq("옛 2(랩핑) → 새 4(랩핑)", by["스모크단계_2_랩핑"]?.stage, MAP[2]);
  c.eq("옛 3(출고) → 새 5(출고)", by["스모크단계_3_출고"]?.stage, MAP[3]);
  c.eq("옛 4(회수) → 새 6(회수)", by["스모크단계_4_회수"]?.stage, MAP[4]);

  // 2) 체크 시각 기록의 키도 같이 옮겨졌는가 — 핵심
  const d = by["스모크단계_3_출고"]?.stage_dates ?? {};
  c.eq("기록 키가 2·4·5 로 옮겨짐", Object.keys(d).sort(), ["2", "4", "5"]);
  c.eq("옛 '1'(발주 시각)의 값이 새 '2' 로", d["2"], "2026-01-01T00:00:00.000Z");
  c.eq("옛 '2'(랩핑 시각)의 값이 새 '4' 로", d["4"], "2026-01-02T00:00:00.000Z");
  c.eq("옛 '3'(출고 시각)의 값이 새 '5' 로", d["5"], "2026-01-03T00:00:00.000Z");
  c.ok("옛 키 '1' 은 남아있지 않음", !("1" in d));
  c.ok("옛 키 '3' 이 그대로 남지 않음(값이 다름)", d["3"] === undefined);

  // 3) 처리자 기록도 동일하게
  const b = by["스모크단계_3_출고"]?.stage_by ?? {};
  c.eq("처리자 기록도 같은 키로", Object.keys(b).sort(), ["2", "4", "5"]);
  c.eq("발주 처리자가 새 '2' 에", b["2"], "김발주");
  c.eq("랩핑 처리자가 새 '4' 에", b["4"], "이랩핑");

  // 4) 기록이 없던 건은 건드리지 않는다
  c.eq("기록 없던 건은 빈 채로", Object.keys(by["스모크단계_0_시작전"]?.stage_dates ?? {}).length, 0);

  // 5) 새 범위(0~6)가 허용되고 그 밖은 막히는가
  await c.accepts("새 단계 6 저장 가능", db,
    `insert into schedules (title, start_date, stage) values ('단계6허용','2026-05-01',6)`);
  await c.rejects("단계 7 은 거부", db,
    `insert into schedules (title, start_date, stage) values ('단계7거부','2026-05-01',7)`);
  await c.rejects("단계 음수는 거부", db,
    `insert into schedules (title, start_date, stage) values ('단계음수','2026-05-01',-1)`);

  // 6) 재실행해도 두 번 밀리지 않는가 — schema_migrations 가 막아야 한다
  const mig = await db.query(`select name from schema_migrations where name='20260927-stage-6'`);
  c.eq("이전 기록이 남음", mig.rows.length, 1);

  return c;
}

/** 마이그레이션 전에 심어둘 옛 형식 데이터 */
export async function seed(db) {
  await db.exec(`
    insert into schedules (title, start_date, stage) values
      ('스모크단계_0_시작전', '2026-03-01', 0),
      ('스모크단계_1_발주',   '2026-03-02', 1),
      ('스모크단계_2_랩핑',   '2026-03-03', 2),
      ('스모크단계_4_회수',   '2026-03-05', 4)`);

  // 시각·처리자 기록이 있는 건 (재매핑의 핵심 대상)
  await db.exec(`
    insert into schedules (title, start_date, stage, stage_dates, stage_by) values
      ('스모크단계_3_출고', '2026-03-04', 3,
       '{"1":"2026-01-01T00:00:00.000Z","2":"2026-01-02T00:00:00.000Z","3":"2026-01-03T00:00:00.000Z"}'::jsonb,
       '{"1":"김발주","2":"이랩핑","3":"박출고"}'::jsonb)`);
}
