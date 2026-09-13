"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShippingRate, deleteShippingRate } from "@/app/admin/(panel)/rates/actions";

const won = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("ko-KR"));
const onlyNum = (v) => String(v).replace(/\D/g, "");

export default function ShippingRateManager({ rows = [] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState({ region: "", quick_fee: "", direct_fee: "" });
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const filtered = useMemo(() => {
    const kw = q.trim();
    if (!kw) return rows;
    return rows.filter((r) => r.region.includes(kw));
  }, [rows, q]);

  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  };

  const save = (row) =>
    startTransition(async () => {
      const res = await saveShippingRate(row);
      if (res?.error) flash("⚠ " + res.error);
      else {
        flash("저장됨");
        router.refresh();
      }
    });

  const add = () => {
    if (!adding.region.trim()) return flash("⚠ 지역명을 입력하세요.");
    startTransition(async () => {
      const res = await saveShippingRate(adding);
      if (res?.error) flash("⚠ " + res.error);
      else {
        setAdding({ region: "", quick_fee: "", direct_fee: "" });
        flash("추가됨");
        router.refresh();
      }
    });
  };

  const del = (id, region) =>
    startTransition(async () => {
      if (!confirm(`'${region}' 배송료를 삭제할까요?`)) return;
      const res = await deleteShippingRate(id);
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
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="지역 검색"
          className="rounded-md border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <span className="text-xs text-ink/40">{filtered.length}개 지역</span>
        {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.03] text-left text-xs text-ink/60">
              <th className="px-3 py-2 font-bold">지역</th>
              <th className="px-3 py-2 text-right font-bold">퀵</th>
              <th className="px-3 py-2 text-right font-bold">직접</th>
              <th className="px-3 py-2 text-center font-bold">관리</th>
            </tr>
          </thead>
          <tbody>
            {/* 새 지역 추가 */}
            <tr className="border-b border-primary/20 bg-primary/[0.03]">
              <td className="px-3 py-2">
                <input
                  value={adding.region}
                  onChange={(e) => setAdding((a) => ({ ...a, region: e.target.value }))}
                  placeholder="+ 새 지역명"
                  className="w-full rounded border border-ink/15 px-2 py-1 text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-3 py-2 text-right">
                <input
                  value={won(adding.quick_fee)}
                  onChange={(e) => setAdding((a) => ({ ...a, quick_fee: onlyNum(e.target.value) }))}
                  placeholder="퀵"
                  className="w-24 rounded border border-ink/15 px-2 py-1 text-right text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-3 py-2 text-right">
                <input
                  value={won(adding.direct_fee)}
                  onChange={(e) => setAdding((a) => ({ ...a, direct_fee: onlyNum(e.target.value) }))}
                  placeholder="직접"
                  className="w-24 rounded border border-ink/15 px-2 py-1 text-right text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  type="button"
                  onClick={add}
                  disabled={pending}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  추가
                </button>
              </td>
            </tr>

            {filtered.map((r) => (
              <RateRow key={r.id} row={r} onSave={save} onDelete={del} pending={pending} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RateRow({ row, onSave, onDelete, pending }) {
  const [quick, setQuick] = useState(row.quick_fee ?? "");
  const [direct, setDirect] = useState(row.direct_fee ?? "");
  const dirty =
    String(quick) !== String(row.quick_fee ?? "") ||
    String(direct) !== String(row.direct_fee ?? "");

  return (
    <tr className="border-b border-ink/5">
      <td className="px-3 py-2 font-medium text-ink/80">{row.region}</td>
      <td className="px-3 py-2 text-right">
        <input
          value={won(quick)}
          onChange={(e) => setQuick(onlyNum(e.target.value))}
          placeholder="—"
          className="w-24 rounded border border-ink/15 px-2 py-1 text-right text-sm outline-none focus:border-primary"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <input
          value={won(direct)}
          onChange={(e) => setDirect(onlyNum(e.target.value))}
          placeholder="—"
          className="w-24 rounded border border-ink/15 px-2 py-1 text-right text-sm outline-none focus:border-primary"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onSave({ id: row.id, region: row.region, quick_fee: quick, direct_fee: direct })}
            disabled={pending || !dirty}
            className={`rounded-md px-2.5 py-1 text-xs font-bold ${
              dirty
                ? "bg-ink text-white hover:bg-ink/90"
                : "bg-ink/5 text-ink/30"
            } disabled:opacity-50`}
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.id, row.region)}
            disabled={pending}
            className="text-xs text-ink/30 hover:text-red-500"
            aria-label="삭제"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
