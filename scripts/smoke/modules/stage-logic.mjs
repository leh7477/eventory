/** 단계 기한 로직 — lib/admin/stages.js 의 실제 코드를 가져와 검증 */
import fs from "node:fs";
import path from "node:path";
import { makeChecker, ROOT } from "../harness.mjs";

function load() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "admin", "stages.js"), "utf8");
  const pure = src.replace(/^export /gm, "");
  return new Function(
    `${pure}; return { STAGES, isMade, stagesFor, isComplete, dueDateOf, stageState, worstStage, MAX_STAGE, MAX_STAGE_MADE };`
  )();
}

export default async function run() {
  const c = makeChecker("단계 기한 로직 (lib/admin/stages.js)");
  const S = load();

  c.eq("단계 6개", S.STAGES.length, 6);
  c.eq("순서", S.STAGES.map((s) => s.label), ["AI파일", "출력물 발주", "출력물 수령", "랩핑", "출고", "회수"]);

  // 납품일 2026-10-20 기준 기한 역산
  const ev = { start_date: "2026-10-20", end_date: "2026-10-22", stage: 0, memo: "용도: 임대" };
  c.eq("AI파일 기한 = D-7", S.dueDateOf(ev, 1), "2026-10-13");
  c.eq("발주 기한 = D-7", S.dueDateOf(ev, 2), "2026-10-13");
  c.eq("수령 기한 = D-4", S.dueDateOf(ev, 3), "2026-10-16");
  c.eq("랩핑 기한 = D-2", S.dueDateOf(ev, 4), "2026-10-18");
  c.eq("출고 기한 = 납품 당일", S.dueDateOf(ev, 5), "2026-10-20");
  c.eq("회수 기한 = 회수일", S.dueDateOf(ev, 6), "2026-10-22");

  // 제작은 회수 없음
  const made = { ...ev, memo: "용도: 제작" };
  c.eq("제작은 5단계까지", S.stagesFor(made).map((s) => s.step), [1, 2, 3, 4, 5]);
  c.eq("임대는 6단계", S.stagesFor(ev).map((s) => s.step), [1, 2, 3, 4, 5, 6]);
  c.ok("제작은 5단계면 완료", S.isComplete({ ...made, stage: 5 }));
  c.ok("임대는 5단계로는 미완료", !S.isComplete({ ...ev, stage: 5 }));

  // 상태 4가지 — 오늘을 2026-10-15 로 두고
  const today = "2026-10-15";
  c.eq("이미 한 단계는 done", S.stageState({ ...ev, stage: 2 }, 1, today), "done");
  c.eq("기한(10-13) 지났는데 안 함 → overdue", S.stageState(ev, 1, today), "overdue");
  c.eq("수령 기한(10-16)이 하루 뒤 → soon", S.stageState(ev, 3, today), "soon");
  c.eq("랩핑 기한(10-18) 3일 뒤 → idle", S.stageState(ev, 4, today), "idle");
  c.eq("출고 기한(10-20) 멀다 → idle", S.stageState(ev, 5, today), "idle");

  // 지난 행사는 경고하지 않는다 (㉮ 선택)
  const past = { start_date: "2026-07-01", end_date: "2026-07-03", stage: 0, memo: "용도: 임대" };
  c.eq("지난 행사는 overdue 로 안 뜸", S.stageState(past, 1, today), "idle");
  c.eq("지난 행사는 worstStage 도 없음", S.worstStage(past, today), null);

  // 가장 급한 것 고르기
  const w = S.worstStage(ev, today);
  c.eq("가장 급한 상태는 overdue", w?.state, "overdue");
  c.eq("가장 급한 단계는 AI파일", w?.stage?.label, "AI파일");

  const w2 = S.worstStage({ ...ev, stage: 2 }, today);
  c.eq("AI파일·발주 끝냈으면 다음은 수령", w2?.stage?.label, "출력물 수령");
  c.eq("그 상태는 soon", w2?.state, "soon");

  const w3 = S.worstStage({ ...ev, stage: 6 }, today);
  c.eq("다 끝냈으면 급한 것 없음", w3, null);

  return c;
}
