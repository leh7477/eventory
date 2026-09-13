"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRentalRate, deleteRentalRate } from "@/app/admin/(panel)/rates/actions";

const won = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("ko-KR"));
const onlyNum = (v) => String(v).replace(/\D/g, "");
const DAYS = Array.from({ length: 14 }, (_, i) => i + 1);

export default function RentalRateManager({ rows = [], categories = [] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  };

  const save = (row) =>
    startTransition(async () => {
      const res = await saveRentalRate(row);
      if (res?.error) flash("⚠ " + res.error);
      else {
        flash("저장됨");
        router.refresh();
      }
    });

  // 카테고리 기준으로 카드 구성 (단가 있으면 병합) + 카테고리에 없는 기존 단가도 표시
  const byProduct = new Map(rows.map((r) => [r.product, r]));
  const cards = [
    ...categories.map((c) => byProduct.get(c) || { product: c, prices: [] }),
    ...rows.filter((r) => !categories.includes(r.product)),
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs text-ink/45">
          재고 카테고리별 <b>N일 대여 총액(원)</b>을 입력합니다. 빈 칸은 미설정(자동 대입 안 됨).
          견적서에서 행사 일수에 맞는 금액이 자동으로 채워집니다.
        </p>
        {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
      </div>

      <div className="space-y-3">
        {cards.map((c) => (
          <ProductCard key={c.product} row={c} onSave={save} pending={pending} />
        ))}
        {cards.length === 0 && (
          <p className="rounded-xl border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/40">
            재고 카테고리가 없습니다. 재고 관리에서 카테고리를 먼저 등록하세요.
          </p>
        )}
      </div>
    </div>
  );
}

function ProductCard({ row, onSave, pending }) {
  const init = Array.from({ length: 14 }, (_, i) => row.prices?.[i] ?? "");
  const [prices, setPrices] = useState(init);

  const dirty = prices.some((v, i) => String(v ?? "") !== String(row.prices?.[i] ?? ""));

  const setPrice = (i, v) =>
    setPrices((arr) => arr.map((x, j) => (j === i ? onlyNum(v) : x)));

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink">{row.product}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSave({ id: row.id, product: row.product, prices })}
            disabled={pending || !dirty}
            className={`rounded-md px-3 py-1 text-xs font-bold ${
              dirty ? "bg-ink text-white hover:bg-ink/90" : "bg-ink/5 text-ink/30"
            } disabled:opacity-50`}
          >
            저장
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr className="text-ink/45">
              {DAYS.map((d) => (
                <th key={d} className="min-w-[64px] px-1 pb-1 text-center font-medium">
                  {d}일
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {DAYS.map((d, i) => (
                <td key={d} className="px-1">
                  <input
                    value={won(prices[i])}
                    onChange={(e) => setPrice(i, e.target.value)}
                    placeholder="—"
                    className="w-16 rounded border border-ink/15 px-1 py-1 text-right text-[11px] outline-none focus:border-primary"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
