/**
 * 행사 진행 단계 정의 — 화면·대시보드·배차가 모두 이 파일을 본다.
 *
 * 실제 업무 순서
 *   업체에서 AI파일 받기 → 출력물 발주 → 출력물 수령 → 랩핑 → 출고 → 회수
 *
 * 기한은 납품일(start_date)에서 역산한다.
 * 제작 건(용도: 제작)은 회수가 없어 5단계까지만 쓴다.
 */

export const STAGES = [
  { step: 1, label: "AI파일",  full: "AI파일 받기",   dueDays: 7 },
  { step: 2, label: "출력물 발주", full: "출력물 발주", dueDays: 7 },
  { step: 3, label: "출력물 수령", full: "출력물 수령", dueDays: 4 },
  { step: 4, label: "랩핑",    full: "랩핑",          dueDays: 2 },
  { step: 5, label: "출고",    full: "출고",          dueDays: 0 },
  { step: 6, label: "회수",    full: "회수",          dueDays: null }, // 회수일 기준
];

export const MAX_STAGE = 6;
/** 제작 건은 회수가 없다 */
export const MAX_STAGE_MADE = 5;

/** 이 일정이 제작 건인가 (memo 에 '용도: 제작') */
export function isMade(ev) {
  return String(ev?.memo || "")
    .split("\n")
    .some((l) => l.trim() === "용도: 제작");
}

/** 이 일정에서 쓰는 단계 목록 */
export function stagesFor(ev) {
  return isMade(ev) ? STAGES.filter((s) => s.step <= MAX_STAGE_MADE) : STAGES;
}

/** 다 끝났는가 */
export function isComplete(ev) {
  const last = isMade(ev) ? MAX_STAGE_MADE : MAX_STAGE;
  return (Number(ev?.stage) || 0) >= last;
}

const DAY = 86400000;
const KST = 9 * 3600000;
const toDate = (s) => (s ? new Date(`${s}T00:00:00+09:00`) : null);

/**
 * Date → 'YYYY-MM-DD' (한국 날짜).
 *
 * getFullYear() 같은 지역시간 메서드를 쓰면 안 된다. 이 값들은 KST 자정에
 * 맞춰 둔 시각이라, 서버처럼 UTC 환경에서 읽으면 하루 전 날짜가 나온다.
 * (대시보드는 서버에서, 일정 화면은 브라우저에서 같은 함수를 부른다)
 * +9시간 민 뒤 UTC 메서드로 읽으면 어느 시간대에서든 한국 날짜가 된다.
 */
function ymdKST(d) {
  const k = new Date(d.getTime() + KST);
  const p = (n) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())}`;
}

/**
 * 한 단계의 기한 날짜(YYYY-MM-DD).
 * 회수(6)는 납품일이 아니라 회수일(end_date) 당일이 기한이다.
 */
export function dueDateOf(ev, step) {
  const s = STAGES.find((x) => x.step === step);
  if (!s) return null;
  if (s.dueDays == null) {
    return ev?.end_date || ev?.start_date || null;
  }
  const base = toDate(ev?.start_date);
  if (!base) return null;
  return ymdKST(new Date(base.getTime() - s.dueDays * DAY));
}

/**
 * 단계 하나의 상태.
 *
 *   done    끝냄                     초록
 *   overdue 기한이 지났는데 안 끝냄   빨강
 *   soon    기한이 2일 안으로 다가옴  주황
 *   idle    아직 여유                회색
 *
 * 지난 행사(납품일이 이미 지난 건)는 경고하지 않는다 — 이미 끝난 일이라
 * 지금 와서 빨갛게 해봐야 할 수 있는 게 없고, 옛 데이터가 전부 빨개진다.
 */
export function stageState(ev, step, today) {
  const cur = Number(ev?.stage) || 0;
  if (cur >= step) return "done";

  const last = ev?.end_date || ev?.start_date;
  if (last && last < today) return "idle"; // 이미 지난 행사는 경고 대상이 아니다

  const due = dueDateOf(ev, step);
  if (!due) return "idle";
  if (due < today) return "overdue";

  const gap = Math.round((toDate(due) - toDate(today)) / DAY);
  return gap <= 2 ? "soon" : "idle";
}

/* ------------------------------------------------------------------
 * 가챠머신 캡슐 발송
 *
 * 출력물을 발주할 때 캡슐도 함께 보내야 한다. 가챠머신에만 있는 일이라
 * 단계(stage) 체인에는 넣지 않는다 — stage 는 정수 하나여서 순서가 곧
 * 숫자이고, 가챠머신만 단계를 끼우면 같은 숫자가 품목마다 다른 뜻이 된다.
 * 또 캡슐 발송은 출력물 수령이나 랩핑을 막는 게이트가 아니라 병렬 작업이다.
 * 그래서 체인과 무관한 독립 플래그(schedules.capsule_sent_at)로 둔다.
 *
 * 해당 여부는 schedule_items 에서 센 수량을 ev.gachaQty 로 붙여 판단한다.
 * ------------------------------------------------------------------ */

/** 캡슐이 필요한 기기 종류 (schedule_items.category 와 맞춘다) */
export const CAPSULE_CATEGORY = "가챠머신";

export const CAPSULE = {
  key: "capsule",
  label: "캡슐 발송",
  full: "가챠머신 캡슐 발송",
  dueDays: 7, // 출력물 발주와 같은 시점
};

/** 이 일정에 나가는 가챠머신 대수 (0이면 캡슐 발송 대상이 아님) */
export function capsuleQty(ev) {
  return Number(ev?.gachaQty) || 0;
}

export function needsCapsule(ev) {
  return capsuleQty(ev) > 0;
}

export function capsuleDue(ev) {
  const base = toDate(ev?.start_date);
  if (!base) return null;
  return ymdKST(new Date(base.getTime() - CAPSULE.dueDays * DAY));
}

/** 캡슐 발송 상태. 대상이 아니면 null — stageState 와 같은 값을 쓴다. */
export function capsuleState(ev, today) {
  if (!needsCapsule(ev)) return null;
  if (ev?.capsule_sent_at) return "done";

  const last = ev?.end_date || ev?.start_date;
  if (last && last < today) return "idle"; // 지난 행사는 경고하지 않는다

  const due = capsuleDue(ev);
  if (!due) return "idle";
  if (due < today) return "overdue";

  const gap = Math.round((toDate(due) - toDate(today)) / DAY);
  return gap <= 2 ? "soon" : "idle";
}

/**
 * 이 일정에서 가장 급한 상태와 그 단계 (대시보드 요약용)
 * 캡슐 발송도 함께 본다 — 체인 밖이지만 놓치면 안 되는 건 같다.
 */
export function worstStage(ev, today) {
  let worst = null;

  const cap = capsuleState(ev, today);
  if (cap === "overdue") return { state: "overdue", stage: CAPSULE };
  if (cap === "soon") worst = { state: "soon", stage: CAPSULE };

  for (const s of stagesFor(ev)) {
    const st = stageState(ev, s.step, today);
    if (st === "overdue") return { state: "overdue", stage: s };   // 가장 나쁨, 즉시 반환
    if (st === "soon" && !worst) worst = { state: "soon", stage: s };
  }
  return worst;
}
