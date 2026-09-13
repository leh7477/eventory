"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSettlement } from "@/app/admin/(panel)/stats/actions";

const won = (n) => (Number(n) || 0).toLocaleString("ko-KR");
const digits = (s) => String(s ?? "").replace(/\D/g, "");

// 정산 상태: 완료(입금완료) / 미입금 / 미발행
function statusOf(d) {
  const contract = Number(d.contract_amount) || 0;
  const paid = Number(d.paid_amount) || 0;
  if (d.paid_date && paid >= contract && contract > 0) return "done";
  if (!d.invoice_date) return "no_invoice";
  return "unpaid";
}

const FILTERS = [
  { v: "all", label: "전체" },
  { v: "no_invoice", label: "미발행" },
  { v: "unpaid", label: "미입금" },
  { v: "done", label: "완료" },
];

export default function SettlementManager({ deals }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      deals.map((d) => [
        d.id,
        {
          invoice_date: d.invoice_date || "",
          paid_date: d.paid_date || "",
          paid_amount: d.paid_amount != null ? String(d.paid_amount) : "",
        },
      ])
    )
  );

  const setField = (id, k, v) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));

  const save = (d) =>
    startTransition(async () => {
      const res = await updateSettlement(d.id, rows[d.id]);
      if (res?.error) alert(res.error);
      else router.refresh();
    });

  const filtered = useMemo(
    () => (filter === "all" ? deals : deals.filter((d) => statusOf(d) === filter)),
    [deals, filter]
  );

  const counts = useMemo(() => {
    const c = { all: deals.length, no_invoice: 0, unpaid: 0, done: 0 };
    for (const d of deals) c[statusOf(d)]++;
    return c;
  }, [deals]);

  const label = (d) =>
    [d.company_name || d.contact_name || d.name || "고객", d.product].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">정산 목록</p>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setFilter(f.v)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                filter === f.v
                  ? "bg-ink text-white"
                  : "border border-ink/15 text-ink/60 hover:bg-ink/5"
              }`}
            >
              {f.label}
              <span className="ml-1 opacity-60">{counts[f.v]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink/40">해당 건이 없습니다.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((d) => {
            const r = rows[d.id];
            const contract = Number(d.contract_amount) || 0;
            const paidNow = Number(digits(r.paid_amount)) || 0;
            const unpaid = contract - paidNow;
            const st = statusOf({ ...d, ...r, paid_amount: digits(r.paid_amount) });
            return (
              <li key={d.id} className="rounded-xl border border-ink/10 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{label(d)}</span>
                  {d.event_start && (
                    <span className="text-xs text-ink/40">{d.event_start}</span>
                  )}
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      st === "done"
                        ? "bg-green-100 text-green-700"
                        : st === "no_invoice"
                        ? "bg-ink/10 text-ink/50"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {st === "done" ? "입금완료" : st === "no_invoice" ? "미발행" : "미입금"}
                  </span>
                </div>

                {/* 금액 요약 */}
                <div className="mb-2 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-md bg-ink/[0.03] py-1.5">
                    <p className="text-[10px] text-ink/45">견적</p>
                    <p className="text-xs font-bold text-ink/70">₩ {won(d.quoted_amount)}</p>
                  </div>
                  <div className="rounded-md bg-ink/[0.03] py-1.5">
                    <p className="text-[10px] text-ink/45">계약</p>
                    <p className="text-xs font-bold text-ink">₩ {won(contract)}</p>
                  </div>
                  <div className="rounded-md bg-green-50 py-1.5">
                    <p className="text-[10px] text-green-700/70">실입금</p>
                    <p className="text-xs font-bold text-green-700">₩ {won(paidNow)}</p>
                  </div>
                  <div className={`rounded-md py-1.5 ${unpaid > 0 ? "bg-red-50" : "bg-ink/[0.03]"}`}>
                    <p className={`text-[10px] ${unpaid > 0 ? "text-red-600/70" : "text-ink/45"}`}>미수금</p>
                    <p className={`text-xs font-bold ${unpaid > 0 ? "text-red-600" : "text-ink/60"}`}>
                      ₩ {won(unpaid)}
                    </p>
                  </div>
                </div>

                {/* 입력 */}
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs text-ink/50">
                    계산서 발행일
                    <input
                      type="date"
                      value={r.invoice_date}
                      onChange={(e) => setField(d.id, "invoice_date", e.target.value)}
                      className="mt-0.5 block rounded-md border border-ink/15 px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-xs text-ink/50">
                    입금일
                    <input
                      type="date"
                      value={r.paid_date}
                      onChange={(e) => setField(d.id, "paid_date", e.target.value)}
                      className="mt-0.5 block rounded-md border border-ink/15 px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-xs text-ink/50">
                    실입금액
                    <input
                      inputMode="numeric"
                      value={r.paid_amount ? Number(digits(r.paid_amount)).toLocaleString("ko-KR") : ""}
                      onChange={(e) => setField(d.id, "paid_amount", digits(e.target.value))}
                      placeholder="0"
                      className="mt-0.5 block w-28 rounded-md border border-ink/15 px-2 py-1 text-right text-xs outline-none focus:border-primary"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save(d)}
                    className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-60"
                  >
                    저장
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
