"use client";

import { useMemo, useState } from "react";

/**
 * 정산 계산기 — 이벤트랜드 한 달 순수익을 둘이 어떻게 나눌지 계산한다.
 *
 * 사업 구조
 *   이벤트랜드 = 친구 명의 사업자. 매출·지출이 모두 여기서 일어난다.
 *   이벤토리   = 이은호 사업자. 이벤트랜드에 홈페이지 관리비로 세금계산서를 발행한다.
 *   → 둘 사이는 B2B 거래라 마지막 +10%(부가세)는 실제로 오간다.
 *
 * 계산 순서
 *   실입금 (그 달 통장에 들어온 돈 — 부가세 포함)
 *    ÷ 1.1 → 공급가          ← 부가세는 매출이 아니라 맡아둔 돈
 *    − 업무 지출 (영수증 총액 그대로)
 *   = 순수익
 *    − 세금·여유 (기본 20%)
 *   = 분배 대상 → 인원수로 나눔
 *    이벤토리 몫은 +10% 붙여 세금계산서로 청구
 *
 * 지출을 공급가(÷1.1)로 환산하지 않는 이유:
 *   매입세액 공제는 지출을 실제로 한 이벤트랜드가 받는다. 총액으로 빼두면
 *   그 공제분이 저절로 회사 통장에 남아 세금 재원이 된다. 대신 면세·불공제
 *   (기름값 등) 구분을 할 필요가 없어 입력이 단순해지고, 틀리는 방향이
 *   항상 안전한 쪽(실제로는 더 남는 쪽)이다.
 *
 * 입력한 지출은 저장하지 않는다. 화면을 벗어나면 사라진다.
 */

const won = (n) => Math.round(Number(n) || 0).toLocaleString("ko-KR");
const onlyNum = (v) => String(v ?? "").replace(/\D/g, "");
const toNum = (v) => (onlyNum(v) === "" ? 0 : parseInt(onlyNum(v), 10));

const pad = (n) => String(n).padStart(2, "0");
const shiftMonth = (ym, d) => {
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
};
const thisMonth = () => {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

export default function SettlementCalculator({ deals = [], people = 2 }) {
  const [month, setMonth] = useState(thisMonth());
  const [expense, setExpense] = useState("");
  const [reservePct, setReservePct] = useState("20");
  const [manual, setManual] = useState(""); // 실입금 직접 입력 (비우면 자동)

  // 그 달에 들어온 입금 (입금일 기준)
  // 그 달에 들어온 입금 — 건별로 센다.
  // 계약금을 9월에, 잔금을 10월에 받으면 각 달에 그만큼만 잡혀야 한다.
  // payments 가 없으면 기존 컬럼 하나를 1회 입금으로 취급한다.
  const monthPaid = useMemo(() => {
    const rows = [];
    for (const d of deals) {
      const list =
        Array.isArray(d.payments) && d.payments.length > 0
          ? d.payments
          : d.paid_date && Number(d.paid_amount) > 0
          ? [{ paid_date: d.paid_date, amount: d.paid_amount, memo: null }]
          : [];
      for (const x of list) {
        if ((x.paid_date || "").slice(0, 7) !== month) continue;
        if (!(Number(x.amount) > 0)) continue;
        rows.push({
          company_name: d.company_name,
          contact_name: d.contact_name,
          paid_date: x.paid_date,
          paid_amount: Number(x.amount),
          memo: x.memo || null,
        });
      }
    }
    rows.sort((a, b) => (a.paid_date < b.paid_date ? -1 : 1));
    return {
      rows,
      total: rows.reduce((s, x) => s + x.paid_amount, 0),
    };
  }, [deals, month]);

  // 그 달에 발행한 계산서 (발행일 기준) — 참고용, 분배 계산에는 쓰지 않는다
  const monthInvoiced = useMemo(() => {
    const rows = deals.filter(
      (d) => (d.invoice_date || "").slice(0, 7) === month && Number(d.contract_amount) > 0
    );
    return {
      rows,
      total: rows.reduce((s, d) => s + Number(d.contract_amount || 0), 0),
    };
  }, [deals, month]);

  const 실입금 = manual.trim() === "" ? monthPaid.total : toNum(manual);
  const 공급가 = Math.round(실입금 / 1.1); // 부가세는 매출이 아니다
  const 지출 = toNum(expense);
  const 순수익 = 공급가 - 지출;
  const pct = Math.min(100, Math.max(0, toNum(reservePct)));
  const 유보 = Math.round((순수익 * pct) / 100);
  const 분배대상 = 순수익 - 유보;
  const 인당 = Math.round(분배대상 / people);
  // 이벤토리가 세금계산서를 끊을 때는 부가세를 얹는다
  const withVat = (n) => Math.round(n * 1.1);

  const inputCls =
    "w-40 rounded-md border border-ink/15 px-2.5 py-1.5 text-right text-sm outline-none focus:border-primary";

  const Row = ({ label, sub, value, bold, color }) => (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className={`text-sm ${bold ? "font-bold text-ink" : "text-ink/60"}`}>
        {label}
        {sub && <span className="ml-1.5 text-xs font-normal text-ink/35">{sub}</span>}
      </span>
      <span
        className={`shrink-0 tabular-nums ${bold ? "text-base font-extrabold" : "text-sm"} ${
          color ?? "text-ink"
        }`}
      >
        ₩ {won(value)}
      </span>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-4">
      {/* 달 고르기 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink/60 hover:bg-ink/5"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-ink">{month.replace("-", ". ")}</span>
        <button
          type="button"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink/60 hover:bg-ink/5"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setMonth(thisMonth())}
          className={`rounded-md px-2.5 py-1 text-xs font-bold ${
            month === thisMonth()
              ? "bg-ink text-white"
              : "border border-ink/15 text-ink/60 hover:bg-ink/5"
          }`}
        >
          이번 달
        </button>
        <span className="ml-auto text-xs text-ink/45">
          입금일 기준 · {monthPaid.rows.length}건
        </span>
      </div>

      {/* 계산 */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-bold text-ink">
            실입금
            <span className="ml-1.5 text-xs font-normal text-ink/40">
              {manual.trim() === "" ? `${month.replace("-", ". ")} 자동` : "직접 입력"}
            </span>
          </span>
          <span className="shrink-0 text-base font-extrabold tabular-nums text-ink">
            ₩ {won(실입금)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-ink/10 pb-3">
          <input
            value={manual === "" ? "" : Number(onlyNum(manual)).toLocaleString("ko-KR")}
            onChange={(e) => setManual(onlyNum(e.target.value))}
            placeholder={`자동: ${won(monthPaid.total)}`}
            className={inputCls}
          />
          {manual.trim() !== "" && (
            <button
              type="button"
              onClick={() => setManual("")}
              className="rounded-md border border-ink/15 px-2.5 py-1 text-xs font-bold text-ink/60 hover:bg-ink/5"
            >
              자동으로
            </button>
          )}
          <span className="text-xs text-ink/40">비워두면 그 달 입금액이 자동으로 들어옵니다</span>
        </div>

        <div className="mt-2 divide-y divide-ink/5">
          <Row
            label="공급가"
            sub="실입금 ÷ 1.1"
            value={공급가}
            bold
          />

          {/* 지출 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-sm text-ink/60">
              업무 지출
              <span className="ml-1.5 text-xs text-ink/35">영수증 총액 그대로</span>
            </span>
            <input
              value={expense === "" ? "" : Number(onlyNum(expense)).toLocaleString("ko-KR")}
              onChange={(e) => setExpense(onlyNum(e.target.value))}
              placeholder="0"
              className={inputCls}
            />
          </div>

          <Row
            label="순수익"
            value={순수익}
            bold
            color={순수익 < 0 ? "text-red-600" : undefined}
          />

          {/* 유보 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="flex items-center gap-1.5 text-sm text-ink/60">
              세금·여유
              <input
                value={reservePct}
                onChange={(e) => setReservePct(onlyNum(e.target.value).slice(0, 3))}
                className="w-12 rounded-md border border-ink/15 px-1.5 py-1 text-center text-sm outline-none focus:border-primary"
              />
              %
              <span className="text-xs text-ink/35">세금 10% + 여유 자금 10%</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-ink/60">− ₩ {won(유보)}</span>
          </div>

          <Row label={`분배 대상 (${100 - pct}%)`} value={분배대상} bold />
        </div>
      </div>

      {/* 인당 */}
      <div className="rounded-2xl border-2 border-ink/15 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-bold text-ink">
            인당
            <span className="ml-1.5 text-xs font-normal text-ink/40">{people}명으로 나눔</span>
          </span>
          <span className="shrink-0 text-2xl font-extrabold tabular-nums text-ink">
            ₩ {won(인당)}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-ink/10 pt-2">
          <span className="text-sm text-ink/55">
            부가세 포함
            <span className="ml-1.5 text-xs text-ink/35">청구 시 10% 추가</span>
          </span>
          <span className="shrink-0 text-lg font-extrabold tabular-nums text-primary">
            ₩ {won(withVat(인당))}
          </span>
        </div>
      </div>

      {/* 참고 — 그 달 계산서 발행분. 위 분배 계산과는 무관하다. */}
      <div className="rounded-2xl border border-dashed border-ink/20 bg-ink/[0.02] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-ink/70">
            계산서 발행
            <span className="ml-1.5 text-xs font-normal text-ink/40">
              참고 · 위 계산에는 들어가지 않음
            </span>
          </span>
          <span className="shrink-0 text-xs text-ink/45">
            발행일 기준 · {monthInvoiced.rows.length}건
          </span>
        </div>

        <div className="mt-2 divide-y divide-ink/5">
          {/* 위 계산이 공급가에서 시작하므로 여기서도 공급가를 강조해 나란히 비교한다 */}
          <Row label="공급가" value={monthInvoiced.total} bold />
          <Row label="청구액" sub="부가세 포함" value={withVat(monthInvoiced.total)} />
        </div>

        {monthInvoiced.rows.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer py-1 text-xs font-bold text-ink/50">
              발행 내역 보기
            </summary>
            <ul className="mt-2 divide-y divide-ink/5 text-sm">
              {monthInvoiced.rows.map((d, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-ink/70">
                    {d.company_name || d.contact_name || "(업체명 없음)"}
                    <span className="ml-1.5 text-xs text-ink/35">{d.invoice_date}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink">
                    ₩ {won(d.contract_amount)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* 근거가 되는 입금 내역 */}
      {monthPaid.rows.length > 0 && manual.trim() === "" && (
        <details className="rounded-2xl border border-ink/10 bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">
            {month.replace("-", ". ")} 입금 내역 {monthPaid.rows.length}건
          </summary>
          <ul className="mt-3 divide-y divide-ink/5 text-sm">
            {monthPaid.rows.map((d, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="min-w-0 truncate text-ink/70">
                  {d.company_name || d.contact_name || "(업체명 없음)"}
                  <span className="ml-1.5 text-xs text-ink/35">
                    {d.paid_date}
                    {d.memo ? ` · ${d.memo}` : ""}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-ink">₩ {won(d.paid_amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs leading-relaxed text-ink/40">
        입력한 지출은 저장되지 않습니다. 화면을 벗어나면 사라집니다.
        <br />
        참고용 계산이며, 실제 세금은 세무 전문가의 확인을 받으세요.
      </p>
    </div>
  );
}
