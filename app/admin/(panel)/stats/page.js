import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import StatsYearList from "@/components/admin/StatsYearList";
import SettlementManager from "@/components/admin/SettlementManager";
import SalesTabs from "@/components/admin/SalesTabs";
import { kstParts } from "@/lib/date";

export const revalidate = 0;

const won = (n) => (n || 0).toLocaleString("ko-KR");
const yearKey = (s) => (s || "").slice(0, 4);
const monthKey = (s) => (s || "").slice(0, 7); // YYYY-MM

export default async function AdminStatsPage({ searchParams }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inquiries")
    .select(
      "id, status, company_name, contact_name, name, product, contract_amount, quoted_amount, invoice_date, paid_date, paid_amount, event_start, created_at"
    )
    .in("status", ["confirmed", "done"])
    .order("event_start", { ascending: false });

  const deals = (data ?? []).filter(
    (d) => d.contract_amount && d.contract_amount > 0
  );

  const yearKeyOf = (d) => yearKey(d.event_start || d.created_at);

  const byYear = {};
  const countByYear = {};
  const byMonth = {};
  const countByMonth = {};
  let total = 0;
  deals.forEach((d) => {
    const base = d.event_start || d.created_at;
    const y = yearKey(base);
    const mk = monthKey(base);
    byYear[y] = (byYear[y] || 0) + d.contract_amount;
    countByYear[y] = (countByYear[y] || 0) + 1;
    byMonth[mk] = (byMonth[mk] || 0) + d.contract_amount;
    countByMonth[mk] = (countByMonth[mk] || 0) + 1;
    total += d.contract_amount;
  });

  const { year: thisYear, month: thisMonthNum } = kstParts();
  const selectedYear = String(searchParams?.year || thisYear);

  // 선택 연도 1~12월
  const monthsOfYear = Array.from(
    { length: 12 },
    (_, i) => `${selectedYear}-${String(i + 1).padStart(2, "0")}`
  );
  const maxMonth = Math.max(1, ...monthsOfYear.map((m) => byMonth[m] || 0));
  const selectedYearTotal = byYear[selectedYear] || 0;

  // 선택 연도의 계약/실입금/미수 (행사 연도 기준)
  const yearDeals = deals.filter((d) => yearKeyOf(d) === selectedYear);
  const yContract = yearDeals.reduce((s, d) => s + (Number(d.contract_amount) || 0), 0);
  const yPaid = yearDeals.reduce((s, d) => s + (Number(d.paid_amount) || 0), 0);
  const yVat = yearDeals.reduce((s, d) => s + Math.round((Number(d.contract_amount) || 0) * 1.1), 0);
  const yUnpaid = yVat - yPaid;
  const initialTab = searchParams?.tab === "stats" ? 1 : 0;

  const count = deals.length;
  const thisYearRevenue = byYear[thisYear] || 0;
  const thisMonthKey = `${thisYear}-${String(thisMonthNum).padStart(2, "0")}`;
  const thisMonthRevenue = byMonth[thisMonthKey] || 0;
  const thisMonthCount = countByMonth[thisMonthKey] || 0;
  const mLabel = thisMonthNum;

  // 다음 달 예정 매출 (행사 기준) — KST 기준
  const nextLabel = thisMonthNum === 12 ? 1 : thisMonthNum + 1;
  const nextYear = thisMonthNum === 12 ? String(parseInt(thisYear, 10) + 1) : thisYear;
  const nextMonthKey = `${nextYear}-${String(nextLabel).padStart(2, "0")}`;
  const nextMonthRevenue = byMonth[nextMonthKey] || 0;

  const cards = [
    { label: `${selectedYear}년 매출`, value: `₩ ${won(selectedYearTotal)}` },
    { label: `이번 달 계약 건수 (${mLabel}월)`, value: `${thisMonthCount}건` },
    { label: `이번 달 매출 (${mLabel}월)`, value: `₩ ${won(thisMonthRevenue)}`, hl: true },
    { label: `다음 달 예정 매출 (${nextLabel}월)`, value: `₩ ${won(nextMonthRevenue)}` },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">매출 관리</h1>
      <p className="mt-1 text-sm text-ink/50">
        계약 금액(수주 기준) 통계와, 계산서 발행·입금(실입금·미수금) 정산을 함께 관리합니다.
      </p>

      <div className="mt-5">
      <SalesTabs tabs={["정산", "통계"]} initial={initialTab}>
        {/* 정산 (먼저) */}
        <SettlementManager deals={deals} />

        {/* 통계 */}
        <div>
      {/* 선택 연도 계약/실입금/미수 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <p className="text-xs text-ink/50">{selectedYear}년 계약</p>
          <p className="mt-1 text-lg font-extrabold text-ink">₩ {won(yContract)}</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-700/70">{selectedYear}년 실입금</p>
          <p className="mt-1 text-lg font-extrabold text-green-700">₩ {won(yPaid)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${yUnpaid > 0 ? "border-red-200 bg-red-50" : "border-ink/10 bg-white"}`}>
          <p className={`text-xs ${yUnpaid > 0 ? "text-red-600/70" : "text-ink/50"}`}>{selectedYear}년 미수금</p>
          <p className={`mt-1 text-lg font-extrabold ${yUnpaid > 0 ? "text-red-600" : "text-ink"}`}>
            ₩ {won(yUnpaid)}
          </p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-5 ${
              c.hl ? "border-primary/30 bg-primary/5" : "border-ink/10 bg-white"
            }`}
          >
            <p className="text-xs text-ink/50">{c.label}</p>
            <p
              className={`mt-1.5 text-xl font-extrabold ${
                c.hl ? "text-primary" : "text-ink"
              }`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* 월별 매출 그래프 */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink">
            월별 매출
            <span className="ml-2 text-xs font-normal text-ink/45">
              연 ₩ {won(selectedYearTotal)}
            </span>
          </p>
          {/* 연도 전환 (화살표) */}
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/stats?year=${Number(selectedYear) - 1}&tab=stats`}
              aria-label="이전 연도"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/15 text-ink/60 hover:bg-ink/5"
            >
              ‹
            </Link>
            <span className="min-w-[52px] text-center text-sm font-bold text-ink">
              {selectedYear}년
            </span>
            <Link
              href={`/admin/stats?year=${Number(selectedYear) + 1}&tab=stats`}
              aria-label="다음 연도"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-ink/15 text-ink/60 hover:bg-ink/5"
            >
              ›
            </Link>
          </div>
        </div>

        {total === 0 ? (
          <p className="py-10 text-center text-sm text-ink/40">
            아직 계약 금액이 입력된 건이 없습니다. 견적 문의에서 계약확정 후 계약
            금액을 입력하면 집계됩니다.
          </p>
        ) : (
          <div className="mt-5 flex items-end gap-1 sm:gap-2">
            {monthsOfYear.map((m, i) => {
              const v = byMonth[m] || 0;
              const h = Math.round((v / maxMonth) * 130);
              return (
                <div key={m} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] font-medium text-ink/45">
                    {v ? Math.round(v / 10000).toLocaleString("ko-KR") : ""}
                  </span>
                  <div
                    className={`w-full rounded-t ${v ? "bg-primary" : "bg-ink/[0.06]"}`}
                    style={{ height: `${Math.max(v ? 4 : 2, h)}px` }}
                    title={v ? `${i + 1}월 · ₩ ${won(v)}` : `${i + 1}월`}
                  />
                  <span className="text-[10px] text-ink/45">{i + 1}</span>
                </div>
              );
            })}
          </div>
        )}
        {total > 0 && (
          <p className="mt-2 text-right text-[11px] text-ink/35">단위: 만원</p>
        )}
      </div>

      {/* 연도별 목록 (클릭 시 월별 내역) */}
      {total > 0 && (
        <div className="mt-6">
          <StatsYearList
            years={Object.keys(byYear)
              .sort((a, b) => (a < b ? 1 : -1))
              .map((y) => ({ year: y, total: byYear[y], count: countByYear[y] }))}
            byMonth={byMonth}
            countByMonth={countByMonth}
          />
        </div>
      )}
        </div>
      </SalesTabs>
      </div>
    </div>
  );
}
