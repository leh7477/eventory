import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0;

const won = (n) => (n || 0).toLocaleString("ko-KR");
const yearKey = (s) => (s || "").slice(0, 4); // YYYY

export default async function AdminStatsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inquiries")
    .select("status, contract_amount, event_start, created_at")
    .in("status", ["confirmed", "done"]);

  const deals = (data ?? []).filter(
    (d) => d.contract_amount && d.contract_amount > 0
  );

  // 연도별 집계 (행사 시작연도 기준, 없으면 접수연도)
  const byYear = {};
  const countByYear = {};
  let total = 0;
  deals.forEach((d) => {
    const y = yearKey(d.event_start || d.created_at);
    byYear[y] = (byYear[y] || 0) + d.contract_amount;
    countByYear[y] = (countByYear[y] || 0) + 1;
    total += d.contract_amount;
  });

  const thisYear = String(new Date().getFullYear());
  // 그래프용 연도: 데이터 있는 연도 + 올해 (오름차순)
  const years = Array.from(new Set([...Object.keys(byYear), thisYear])).sort();
  const maxVal = Math.max(1, ...years.map((y) => byYear[y] || 0));

  const count = deals.length;
  const avg = count ? Math.round(total / count) : 0;
  const thisYearRevenue = byYear[thisYear] || 0;

  const cards = [
    { label: "총 계약 매출", value: `₩ ${won(total)}` },
    { label: `${thisYear}년 매출`, value: `₩ ${won(thisYearRevenue)}`, hl: true },
    { label: "확정 계약 건수", value: `${count}건` },
    { label: "평균 계약 금액", value: `₩ ${won(avg)}` },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">매출 통계</h1>
      <p className="mt-1 text-sm text-ink/50">
        계약확정 문의에 입력된 계약 금액(공급가액·부가세 별도)을 행사 연도 기준으로 집계합니다.
      </p>

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

      {/* 연도별 막대 그래프 */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-5">
        <p className="text-sm font-bold text-ink">연도별 매출</p>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-ink/40">
            아직 계약 금액이 입력된 건이 없습니다. 견적 문의에서 계약확정 후 계약
            금액을 입력하면 집계됩니다.
          </p>
        ) : (
          <div className="mt-5 flex items-end justify-around gap-4">
            {years.map((y) => {
              const v = byYear[y] || 0;
              const h = Math.round((v / maxVal) * 150);
              const isThis = y === thisYear;
              return (
                <div key={y} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium text-ink/50">
                    {v ? `${Math.round(v / 10000).toLocaleString("ko-KR")}만` : ""}
                  </span>
                  <div
                    className={`w-full max-w-24 rounded-t-md ${isThis ? "bg-primary" : "bg-ink/70"}`}
                    style={{ height: `${Math.max(v ? 6 : 2, h)}px` }}
                    title={`₩ ${won(v)}`}
                  />
                  <span className="text-xs font-medium text-ink/60">
                    {y.slice(2)}년
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 연도별 목록 */}
      {total > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <p className="border-b border-ink/10 px-4 py-2.5 text-sm font-bold text-ink">
            연도별 매출
          </p>
          <ul className="divide-y divide-ink/5">
            {Object.keys(byYear)
              .sort((a, b) => (a < b ? 1 : -1))
              .map((y) => (
                <li key={y} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-ink/70">
                    {y}년
                    <span className="ml-2 text-xs text-ink/40">
                      {countByYear[y]}건
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    ₩ {won(byYear[y])}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
