"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRentalRate, deleteRentalRate } from "@/app/admin/(panel)/rates/actions";

const won = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("ko-KR"));
const onlyNum = (v) => String(v).replace(/\D/g, "");
const DAYS = Array.from({ length: 14 }, (_, i) => i + 1);

export default function RentalRateManager({ rows = [] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [newProduct, setNewProduct] = useState("");

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

  const add = () => {
    if (!newProduct.trim()) return flash("⚠ 제품명을 입력하세요.");
    startTransition(async () => {
      const res = await saveRentalRate({ product: newProduct, size: "", prices: [] });
      if (res?.error) flash("⚠ " + res.error);
      else {
        setNewProduct("");
        flash("추가됨");
        router.refresh();
      }
    });
  };

  const del = (id, product) =>
    startTransition(async () => {
      if (!confirm(`'${product}' 대여 단가를 삭제할까요?`)) return;
      const res = await deleteRentalRate(id);
      if (res?.error) flash("⚠ " + res.error);
      else {
        flash("삭제됨");
        router.refresh();
      }
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={newProduct}
          onChange={(e) => setNewProduct(e.target.value)}
          placeholder="+ 새 제품명"
          className="rounded-md border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          제품 추가
        </button>
        {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
      </div>

      <p className="mb-3 text-xs text-ink/45">
        숫자는 <b>N일 대여 총액(원)</b>입니다. 빈 칸은 미설정(자동 대입 안 됨). 견적서에서 행사
        일수에 맞는 금액이 자동으로 채워집니다.
      </p>

      <div className="space-y-3">
        {rows.map((r) => (
          <ProductCard key={r.id} row={r} onSave={save} onDelete={del} pending={pending} />
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/40">
            등록된 대여 단가가 없습니다. 위에서 제품을 추가하세요.
          </p>
        )}
      </div>
    </div>
  );
}

function ProductCard({ row, onSave, onDelete, pending }) {
  const [product, setProduct] = useState(row.product || "");
  const [size, setSize] = useState(row.size || "");
  const init = Array.from({ length: 14 }, (_, i) => row.prices?.[i] ?? "");
  const [prices, setPrices] = useState(init);

  const dirty =
    product !== (row.product || "") ||
    size !== (row.size || "") ||
    prices.some((v, i) => String(v ?? "") !== String(row.prices?.[i] ?? ""));

  const setPrice = (i, v) =>
    setPrices((arr) => arr.map((x, j) => (j === i ? onlyNum(v) : x)));

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="제품명"
          className="rounded border border-ink/15 px-2 py-1 text-sm font-bold outline-none focus:border-primary"
        />
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="규격 (예: 600*1750*200)"
          className="w-56 rounded border border-ink/15 px-2 py-1 text-xs text-ink/60 outline-none focus:border-primary"
        />
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSave({ id: row.id, product, size, prices })}
            disabled={pending || !dirty}
            className={`rounded-md px-3 py-1 text-xs font-bold ${
              dirty ? "bg-ink text-white hover:bg-ink/90" : "bg-ink/5 text-ink/30"
            } disabled:opacity-50`}
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.id, row.product)}
            disabled={pending}
            className="text-xs text-ink/30 hover:text-red-500"
            aria-label="삭제"
          >
            ✕
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
