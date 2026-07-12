"use client";

import { useState } from "react";

const won = (n) => (n || 0).toLocaleString("ko-KR");

export default function StatsYearList({ years, byMonth, countByMonth }) {
  const [openYear, setOpenYear] = useState(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <p className="border-b border-ink/10 px-4 py-2.5 text-sm font-bold text-ink">
        연도별 매출
        <span className="ml-2 text-xs font-normal text-ink/40">
          연도를 누르면 월별 내역이 열립니다
        </span>
      </p>
      <ul className="divide-y divide-ink/5">
        {years.map((y) => {
          const isOpen = openYear === y.year;
          const months = Array.from({ length: 12 }, (_, i) => {
            const mk = `${y.year}-${String(i + 1).padStart(2, "0")}`;
            return { m: i + 1, amt: byMonth[mk] || 0, cnt: countByMonth[mk] || 0 };
          }).filter((x) => x.cnt > 0);

          return (
            <li key={y.year}>
              <button
                type="button"
                onClick={() => setOpenYear(isOpen ? null : y.year)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-ink/[0.02]"
              >
                <span className="text-sm text-ink/70">
                  {y.year}년
                  <span className="ml-2 text-xs text-ink/40">{y.count}건</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    ₩ {won(y.total)}
                  </span>
                  <span className="text-xs text-ink/30">{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>

              {isOpen && (
                <div className="bg-ink/[0.015] px-4 py-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-ink/40">
                        <th className="py-1.5 font-medium">월</th>
                        <th className="py-1.5 text-center font-medium">건수</th>
                        <th className="py-1.5 text-right font-medium">매출</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((x) => (
                        <tr key={x.m} className="border-t border-ink/5">
                          <td className="py-1.5 text-ink/70">{x.m}월</td>
                          <td className="py-1.5 text-center text-ink/60">
                            {x.cnt}건
                          </td>
                          <td className="py-1.5 text-right font-medium text-ink">
                            ₩ {won(x.amt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
