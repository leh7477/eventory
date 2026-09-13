"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { updateSettlement } from "@/app/admin/(panel)/stats/actions";

const won = (n) => (Number(n) || 0).toLocaleString("ko-KR");
const digits = (s) => String(s ?? "").replace(/\D/g, "");
const vatTotalOf = (d) => Math.round((Number(d.contract_amount) || 0) * 1.1);

function statusOf(d) {
  const paid = Number(d.paid_amount) || 0;
  if (d.paid_date && paid > 0) return "done";
  if (!d.invoice_date) return "no_invoice";
  return "unpaid";
}

const FILTERS = [
  { v: "all", label: "전체" },
  { v: "no_invoice", label: "미발행" },
  { v: "unpaid", label: "미입금" },
  { v: "done", label: "완료" },
];

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function SettlementManager({ deals }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [pending, startTransition] = useTransition();
  const [openInvoice, setOpenInvoice] = useState(null);
  const [openPay, setOpenPay] = useState(null);
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      deals.map((d) => [
        d.id,
        {
          invoice_date: d.invoice_date || "",
          paid_date: d.paid_date || "",
          paid_amount: d.paid_amount != null ? String(d.paid_amount) : String(vatTotalOf(d)),
        },
      ])
    )
  );

  const setField = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));

  const save = (d, after, override) =>
    startTransition(async () => {
      const payload = { ...rows[d.id], ...(override || {}) };
      const res = await updateSettlement(d.id, payload);
      if (res?.error) alert(res.error);
      else {
        if (override) setRows((r) => ({ ...r, [d.id]: { ...r[d.id], ...override } }));
        after?.();
        router.refresh();
      }
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
                filter === f.v ? "bg-ink text-white" : "border border-ink/15 text-ink/60 hover:bg-ink/5"
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
            const vat = vatTotalOf(d);
            const paidSaved = Number(d.paid_amount) || 0;
            const unpaid = vat - paidSaved;
            const st = statusOf(d);
            return (
              <li key={d.id} className="rounded-xl border border-ink/10 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{label(d)}</span>
                  {d.event_start && <span className="text-xs text-ink/40">{d.event_start}</span>}
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
                    <p className="text-[10px] text-ink/45">견적(공급가)</p>
                    <p className="text-xs font-bold text-ink/70">₩ {won(d.quoted_amount)}</p>
                  </div>
                  <div className="rounded-md bg-ink/[0.03] py-1.5">
                    <p className="text-[10px] text-ink/45">청구(VAT포함)</p>
                    <p className="text-xs font-bold text-ink">₩ {won(vat)}</p>
                  </div>
                  <div className="rounded-md bg-green-50 py-1.5">
                    <p className="text-[10px] text-green-700/70">실입금</p>
                    <p className="text-xs font-bold text-green-700">₩ {won(paidSaved)}</p>
                  </div>
                  <div className={`rounded-md py-1.5 ${unpaid > 0 ? "bg-red-50" : "bg-ink/[0.03]"}`}>
                    <p className={`text-[10px] ${unpaid > 0 ? "text-red-600/70" : "text-ink/45"}`}>미수금</p>
                    <p className={`text-xs font-bold ${unpaid > 0 ? "text-red-600" : "text-ink/60"}`}>
                      ₩ {won(unpaid)}
                    </p>
                  </div>
                </div>

                {/* 계산서 발행 */}
                <div className="flex flex-wrap items-center gap-2">
                  {d.invoice_date ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      🧾 계산서 {d.invoice_date}
                    </span>
                  ) : (
                    <span className="text-xs text-ink/40">🧾 계산서 미발행</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPay(null);
                      if (openInvoice === d.id) setOpenInvoice(null);
                      else {
                        if (!r.invoice_date) setField(d.id, "invoice_date", todayStr());
                        setOpenInvoice(d.id);
                      }
                    }}
                    className="rounded-md border border-ink/15 px-2.5 py-1 text-xs text-ink/60 hover:bg-ink/5"
                  >
                    {d.invoice_date ? "발행일 수정" : "계산서 발행"}
                  </button>

                  {/* 입금 확인 */}
                  {d.paid_date ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      💰 입금 {d.paid_date} · ₩ {won(d.paid_amount)}
                    </span>
                  ) : (
                    <span className="text-xs text-ink/40">💰 미입금</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenInvoice(null);
                      if (openPay === d.id) setOpenPay(null);
                      else {
                        if (!r.paid_date) setField(d.id, "paid_date", todayStr());
                        if (!digits(r.paid_amount)) setField(d.id, "paid_amount", String(vat));
                        setOpenPay(d.id);
                      }
                    }}
                    className="rounded-md border border-green-300 px-2.5 py-1 text-xs font-bold text-green-700 hover:bg-green-50"
                  >
                    {d.paid_date ? "입금 수정" : "입금 확인"}
                  </button>
                </div>

                {/* 계산서 발행 팝오버 */}
                {openInvoice === d.id && (
                  <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                    <p className="mb-1.5 text-xs font-bold text-ink/60">계산서 발행일</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-40">
                        <DatePicker
                          value={r.invoice_date}
                          onChange={(v) => setField(d.id, "invoice_date", v)}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => save(d, () => setOpenInvoice(null))}
                        className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black"
                      >
                        저장
                      </button>
                      {d.invoice_date && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => save(d, () => setOpenInvoice(null), { invoice_date: "" })}
                          className="rounded-md border border-ink/15 px-2.5 py-1.5 text-xs text-ink/50 hover:bg-ink/5"
                        >
                          발행 취소
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenInvoice(null)}
                        className="text-xs text-ink/40"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}

                {/* 입금 확인 팝오버 */}
                {openPay === d.id && (
                  <div className="mt-2 rounded-lg border border-green-200 bg-green-50/50 p-3">
                    <p className="mb-1.5 text-xs font-bold text-ink/60">
                      입금 확인{" "}
                      <span className="font-normal text-ink/45">
                        (예상 부가세 포함 ₩ {won(vat)})
                      </span>
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-xs text-ink/50">
                        입금일
                        <div className="mt-0.5 w-40">
                          <DatePicker
                            value={r.paid_date}
                            onChange={(v) => setField(d.id, "paid_date", v)}
                          />
                        </div>
                      </label>
                      <label className="text-xs text-ink/50">
                        실입금액 (부가세 포함)
                        <input
                          inputMode="numeric"
                          value={r.paid_amount ? Number(digits(r.paid_amount)).toLocaleString("ko-KR") : ""}
                          onChange={(e) => setField(d.id, "paid_amount", digits(e.target.value))}
                          className="mt-0.5 block w-32 rounded-md border border-ink/15 px-2 py-1.5 text-right text-sm font-bold outline-none focus:border-primary"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => save(d, () => setOpenPay(null))}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                      >
                        확인
                      </button>
                      {d.paid_date && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => save(d, () => setOpenPay(null), { paid_date: "", paid_amount: "" })}
                          className="rounded-md border border-ink/15 px-2.5 py-1.5 text-xs text-ink/50 hover:bg-ink/5"
                        >
                          입금 취소
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
