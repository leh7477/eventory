"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMadeRate } from "@/app/admin/(panel)/rates/actions";

const won = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("ko-KR"));
const onlyNum = (v) => String(v).replace(/\D/g, "");

export default function MadeRateManager({ rows = [], categories = [] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  };

  const save = (product, price) =>
    startTransition(async () => {
      const res = await saveMadeRate(product, price);
      if (res?.error) flash("⚠ " + res.error);
      else {
        flash("저장됨");
        router.refresh();
      }
    });

  // 카테고리 기준 카드 구성 (기존 made_price 병합) + 카테고리에 없는 기존 항목도 표시
  const byProduct = new Map(rows.map((r) => [r.product, r]));
  const cards = [
    ...categories.map((c) => byProduct.get(c) || { product: c, made_price: null }),
    ...rows.filter((r) => !categories.includes(r.product)),
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs text-ink/45">
          카테고리별 <b>제작 단가(원)</b>를 참고용으로 기록합니다. (제작 견적은 사양에 따라
          달라지므로 견적서에는 직접 입력합니다)
        </p>
        {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.03] text-left text-xs text-ink/60">
              <th className="px-3 py-2 font-bold">제품(카테고리)</th>
              <th className="px-3 py-2 text-right font-bold">제작 단가</th>
              <th className="px-3 py-2 text-center font-bold">관리</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <MadeRow key={c.product} row={c} onSave={save} pending={pending} />
            ))}
            {cards.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-sm text-ink/40">
                  재고 카테고리가 없습니다. 재고 관리에서 카테고리를 먼저 등록하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MadeRow({ row, onSave, pending }) {
  const [price, setPrice] = useState(row.made_price ?? "");
  const dirty = String(price) !== String(row.made_price ?? "");

  return (
    <tr className="border-b border-ink/5">
      <td className="px-3 py-2 font-medium text-ink/80">{row.product}</td>
      <td className="px-3 py-2 text-right">
        <input
          value={won(price)}
          onChange={(e) => setPrice(onlyNum(e.target.value))}
          placeholder="—"
          className="w-32 rounded border border-ink/15 px-2 py-1 text-right text-sm outline-none focus:border-primary"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={() => onSave(row.product, price)}
          disabled={pending || !dirty}
          className={`rounded-md px-3 py-1 text-xs font-bold ${
            dirty ? "bg-ink text-white hover:bg-ink/90" : "bg-ink/5 text-ink/30"
          } disabled:opacity-50`}
        >
          저장
        </button>
      </td>
    </tr>
  );
}
