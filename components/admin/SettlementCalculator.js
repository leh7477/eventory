"use client";

import { useMemo, useState } from "react";

/**
 * 정산 계산기 — 한 달 실입금을 둘이 어떻게 나눌지 계산한다.
 *
 * 계산 순서
 *   실입금 (그 달에 들어온 돈)
 *    − 부가세분 (입금액의 1/11)   ← 국세청에 낼 돈. 끄면 포함해서 나눈다
 *   = 매출
 *    − 업무 지출
 *   = 순수익
 *    − 세금·여유 (기본 20%)
 *   = 분배 대상 → 반반
 *    ± 홈페이지 관리비 (한쪽이 받고 한쪽이 냄)
 *
 * 입력한 지출·관리비는 저장하지 않는다. 화면을 벗어나면 사라진다.
 * (기록이 필요해지면 지출 표를 따로 만드는 편이 낫다)
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
  const [exVat, setExVat] = useState(true); // 부가세분을 빼고 나눌지
  const [expense, setExpense] = useState("");
  const [reservePct, setReservePct] = useState("20");
  const [fee, setFee] = useState(""); // 홈페이지 관리비
  const [manual, setManual] = useState(""); // 실입금 직접 입력 (비우면 자동)

  // 그 달에 들어온 입금 (입금일 기준)
  const monthPaid = useMemo(() => {
    const rows = deals.filter(
      (d) => (d.paid_date || "").slice(0, 7) === month && Number(d.paid_amount) > 0
    );
    return {
      rows,
      total: rows.reduce((s, d) => s + Number(d.paid_amount || 0), 0),
    };
  }, [deals, month]);

  const 실입금 = manual.trim() === "" ? monthPaid.total : toNum(manual);
  const 부가세 = exVat ? Math.round(실입금 / 11) : 0;
  const 매출 = 실입금 - 부가세;
  const 지출 = toNum(expense);
  const 순수익 = 매출 - 지출;
  const pct = Math.min(100, Math.max(0, toNum(reservePct)));
  const 유보 = Math.round((순수익 * pct) / 100);
  const 분배대상 = 순수익 - 유보;
  const 인당 = Math.round(분배대상 / people);
  const 관리비 = toNum(fee);
  // 청구할 때는 부가세를 얹어 받으므로 포함 금액도 같이 보여준다
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
          {/* 부가세 */}
          <div className="flex items-center justify-between gap-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/60">
              <input
                type="checkbox"
                checked={exVat}
                onChange={(e) => setExVat(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              부가세분 빼기
              <span className="text-xs text-ink/35">입금액의 1/11 · 국세청에 낼 몫</span>
            </label>
            <span className="shrink-0 text-sm tabular-nums text-ink/60">− ₩ {won(부가세)}</span>
          </div>

          <Row label="매출" value={매출} bold />

          {/* 지출 */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-sm text-ink/60">
              업무 지출
              <span className="ml-1.5 text-xs text-ink/35">기름값·택배·부자재 등</span>
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
              <span className="text-xs text-ink/35">소득세 10 + 여유 10</span>
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

      {/* 홈페이지 관리비 — 분배와 별개로 청구하는 금액 */}
      <div className="rounded-2xl border border-ink/10 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-ink/60">
            홈페이지 관리비
            <span className="ml-1.5 text-xs text-ink/35">분배와 별개로 청구</span>
          </span>
          <input
            value={fee === "" ? "" : Number(onlyNum(fee)).toLocaleString("ko-KR")}
            onChange={(e) => setFee(onlyNum(e.target.value))}
            placeholder="0"
            className={inputCls}
          />
        </div>
        {관리비 > 0 && (
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-ink/10 pt-2">
            <span className="text-sm text-ink/55">
              부가세 포함
              <span className="ml-1.5 text-xs text-ink/35">청구 시 10% 추가</span>
            </span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
              ₩ {won(withVat(관리비))}
            </span>
          </div>
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
                  <span className="ml-1.5 text-xs text-ink/35">{d.paid_date}</span>
                </span>
                <span className="shrink-0 tabular-nums text-ink">₩ {won(d.paid_amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs leading-relaxed text-ink/40">
        입력한 지출·관리비는 저장되지 않습니다. 화면을 벗어나면 사라집니다.
        <br />
        참고용 계산이며, 실제 세금은 세무 전문가의 확인을 받으세요.
      </p>
    </div>
  );
}
