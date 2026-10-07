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

/* ------------------------------------------------------------------
 * 입금 내역 (payments)
 *
 * settlements 는 입금일·입금액을 하나씩만 가진다. 계약금과 잔금을 나눠
 * 받으면 담을 데가 없고, 합계만 적으면 정산 계산기가 입금일로 달을 나눌 때
 * 두 달치가 한 달에 몰린다. 그래서 건별로 payments 에 쌓는다.
 *
 * settlements.paid_amount 는 합계로 계속 유지한다(이 값을 보는 화면이 여럿).
 * payments 표가 아직 없으면 기존 컬럼 하나를 1회 입금으로 취급해
 * 화면이 그대로 동작한다.
 * ------------------------------------------------------------------ */

/** 문의들에 입금 내역(payments)을 붙인다 */
export async function attachPayments(admin, rows = []) {
  if (rows.length === 0) return rows;

  const { data, error } = await admin
    .from("payments")
    .select("id, inquiry_id, paid_date, amount, memo, created_by")
    .in("inquiry_id", rows.map((r) => r.id))
    .order("paid_date", { ascending: true });

  // 표가 아직 없으면 기존 컬럼을 1회 입금으로 환산
  if (error) {
    return rows.map((r) => ({
      ...r,
      payments:
        r.paid_date && Number(r.paid_amount) > 0
          ? [
              {
                id: null,
                paid_date: r.paid_date,
                amount: Number(r.paid_amount),
                memo: null,
                created_by: r.paid_by ?? null,
              },
            ]
          : [],
    }));
  }

  const byInquiry = new Map();
  for (const p of data ?? []) {
    if (!byInquiry.has(p.inquiry_id)) byInquiry.set(p.inquiry_id, []);
    byInquiry.get(p.inquiry_id).push(p);
  }
  return rows.map((r) => ({ ...r, payments: byInquiry.get(r.id) ?? [] }));
}

/** 입금 내역 합계 (내역이 없으면 기존 컬럼으로 대체) */
export function paidTotalOf(row) {
  const list = row?.payments;
  if (Array.isArray(list) && list.length > 0) {
    return list.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  }
  return Number(row?.paid_amount) || 0;
}

/** 가장 마지막 입금일 — 목록에 한 줄로 보여줄 때 쓴다 */
export function lastPaidDateOf(row) {
  const list = row?.payments;
  if (Array.isArray(list) && list.length > 0) {
    return list.reduce((a, p) => (a > p.paid_date ? a : p.paid_date), "");
  }
  return row?.paid_date || "";
}

/**
 * settlements.paid_amount / paid_date 를 payments 합계와 맞춘다.
 * 입금을 추가·삭제한 뒤 반드시 부른다 — 이 값을 보는 화면이 여럿이다.
 */
export async function syncPaidTotal(admin, inquiryId) {
  const { data, error } = await admin
    .from("payments")
    .select("paid_date, amount")
    .eq("inquiry_id", inquiryId);
  if (error) return { error: error.message };

  const list = data ?? [];
  const total = list.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const last = list.reduce((a, p) => (a > p.paid_date ? a : p.paid_date), "");

  return saveSettlement(
    admin,
    inquiryId,
    { paid_amount: total > 0 ? String(total) : "", paid_date: total > 0 ? last : "" },
    null
  );
}
