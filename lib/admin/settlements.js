/**
 * 정산 데이터 접근
 *
 * 배경
 *   정산은 원래 inquiries 테이블 안에 컬럼 10개로 들어 있었다.
 *   (고객정보·문의내용·진행상태·정산·이력이 한 표에 섞여 컬럼이 31개)
 *   별도 표(settlements)로 분리하는 중이며, 이 모듈이 그 과도기를 담당한다.
 *
 * 이관 전략 — 양쪽에 쓰고, 새 표를 우선해서 읽는다
 *   쓰기 : settlements 와 inquiries 양쪽에 저장한다.
 *          → 마이그레이션 전이면 inquiries 만 저장되고 화면은 그대로 동작한다.
 *          → 마이그레이션 후에는 양쪽이 같은 값을 갖는다.
 *   읽기 : settlements 행이 있으면 그것을, 없으면 inquiries 컬럼을 쓴다.
 *   정리 : 한 달 이상 관찰한 뒤 inquiries 의 정산 컬럼을 제거한다.
 *
 * 아래 buildSettlementUpdate / mergeSettlement 은 DB 없이 동작하는 순수 함수다.
 * (scripts/smoke/modules/settlement-logic.mjs 에서 검증)
 */

/** 화면이 보내온 금액 문자열을 정수로. 빈 값은 null */
export function toAmount(v) {
  if (v == null) return null;
  const digits = String(v).replace(/\D/g, "");
  return digits === "" ? null : parseInt(digits, 10);
}

/**
 * 전달된 필드만 골라 저장할 값과 처리자·시각 도장을 만든다.
 *
 * 계산서 발행일·입금일을 넣으면 "누가 언제 처리했는지"를 함께 남기고,
 * 날짜를 지우면 도장도 함께 지운다.
 *
 * @returns {{core: object, stamps: object, empty: boolean}}
 */
export function buildSettlementUpdate(fields = {}, actor = null, nowIso = null) {
  const core = {};
  const stamps = {};
  const now = nowIso ?? new Date().toISOString();

  if ("invoice_date" in fields) {
    core.invoice_date = fields.invoice_date || null;
    const on = !!fields.invoice_date;
    stamps.invoice_by = on ? actor : null;
    stamps.invoice_at = on ? now : null;
  }
  if ("paid_date" in fields) {
    core.paid_date = fields.paid_date || null;
    const on = !!fields.paid_date;
    stamps.paid_by = on ? actor : null;
    stamps.paid_at = on ? now : null;
  }
  if ("paid_amount" in fields) core.paid_amount = toAmount(fields.paid_amount);
  if ("contract_amount" in fields) core.contract_amount = toAmount(fields.contract_amount);
  if ("quoted_amount" in fields) core.quoted_amount = toAmount(fields.quoted_amount);
  if ("settle_memo" in fields) core.memo = (fields.settle_memo ?? "").trim() || null;

  return {
    core,
    stamps,
    empty: Object.keys(core).length === 0 && Object.keys(stamps).length === 0,
  };
}

/** settlements 의 컬럼 이름을 inquiries 쪽 이름으로 되돌린다 (memo ↔ settle_memo) */
export function toInquiryShape(core) {
  const out = { ...core };
  if ("memo" in out) {
    out.settle_memo = out.memo;
    delete out.memo;
  }
  return out;
}

/**
 * 한 문의의 정산 값을 확정한다.
 * settlements 행이 있으면 그쪽이 이긴다. 없으면 inquiries 컬럼을 쓴다.
 */
export function mergeSettlement(inquiry = {}, settlement = null) {
  const pick = (a, b) => (a === undefined || a === null ? b ?? null : a);
  if (!settlement) {
    return {
      quoted_amount: inquiry.quoted_amount ?? null,
      contract_amount: inquiry.contract_amount ?? null,
      paid_amount: inquiry.paid_amount ?? null,
      invoice_date: inquiry.invoice_date ?? null,
      invoice_by: inquiry.invoice_by ?? null,
      invoice_at: inquiry.invoice_at ?? null,
      paid_date: inquiry.paid_date ?? null,
      paid_by: inquiry.paid_by ?? null,
      paid_at: inquiry.paid_at ?? null,
      settle_memo: inquiry.settle_memo ?? null,
      _source: "inquiries",
    };
  }
  return {
    quoted_amount: pick(settlement.quoted_amount, inquiry.quoted_amount),
    contract_amount: pick(settlement.contract_amount, inquiry.contract_amount),
    paid_amount: pick(settlement.paid_amount, inquiry.paid_amount),
    invoice_date: pick(settlement.invoice_date, inquiry.invoice_date),
    invoice_by: pick(settlement.invoice_by, inquiry.invoice_by),
    invoice_at: pick(settlement.invoice_at, inquiry.invoice_at),
    paid_date: pick(settlement.paid_date, inquiry.paid_date),
    paid_by: pick(settlement.paid_by, inquiry.paid_by),
    paid_at: pick(settlement.paid_at, inquiry.paid_at),
    settle_memo: pick(settlement.memo, inquiry.settle_memo),
    _source: "settlements",
  };
}

// ── DB 접근 ─────────────────────────────────────────────────

/**
 * 문의 목록에 정산 값을 합쳐서 돌려준다.
 * settlements 표가 아직 없으면 문의를 그대로 돌려준다.
 */
export async function attachSettlements(admin, inquiries = []) {
  if (inquiries.length === 0) return inquiries;

  const { data, error } = await admin
    .from("settlements")
    .select("*")
    .in("inquiry_id", inquiries.map((q) => q.id));

  // 표가 아직 없으면 기존 컬럼을 그대로 쓴다
  if (error) return inquiries.map((q) => ({ ...q, ...mergeSettlement(q, null) }));

  const byInquiry = new Map((data ?? []).map((s) => [s.inquiry_id, s]));
  return inquiries.map((q) => ({ ...q, ...mergeSettlement(q, byInquiry.get(q.id)) }));
}

/**
 * 정산을 저장한다. settlements 와 inquiries 양쪽에 쓴다.
 * settlements 표가 없으면 inquiries 에만 쓰고 정상 처리한다.
 *
 * @returns {{ok: true} | {error: string}}
 */
export async function saveSettlement(admin, inquiryId, fields, actor) {
  const { core, stamps, empty } = buildSettlementUpdate(fields, actor);
  if (empty) return { ok: true };

  // 1) 새 표 — 없으면 조용히 건너뛴다
  try {
    await admin
      .from("settlements")
      .upsert({ inquiry_id: inquiryId, ...core, ...stamps, updated_at: new Date().toISOString() },
              { onConflict: "inquiry_id" });
  } catch {
    // 표 미적용 상태
  }

  // 2) 기존 컬럼 — 화면이 아직 이쪽을 읽으므로 반드시 저장한다
  const legacy = toInquiryShape(core);
  let { error } = await admin
    .from("inquiries")
    .update({ ...legacy, ...stamps })
    .eq("id", inquiryId);

  // 처리자·시각 컬럼이 없는 오래된 DB 면 핵심 값만 다시 시도
  if (error && /invoice_by|invoice_at|paid_by|paid_at/i.test(error.message)) {
    ({ error } = await admin.from("inquiries").update(legacy).eq("id", inquiryId));
  }
  if (error) {
    if (/invoice_date|paid_date|paid_amount|column/i.test(error.message)) {
      return { error: "정산 컬럼이 아직 없습니다. 안내된 SQL을 먼저 실행해주세요." };
    }
    return { error: error.message };
  }
  return { ok: true };
}
