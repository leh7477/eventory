"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { updateSettlement } from "@/app/admin/(panel)/stats/actions";

const won = (n) => (Number(n) || 0).toLocaleString("ko-KR");
const digits = (s) => String(s ?? "").replace(/\D/g, "");
// ISO → "MM/DD HH:mm" (브라우저=KST)
const fmtStamp = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const vatTotalOf = (d) => Math.round((Number(d.contract_amount) || 0) * 1.1);

function statusOf(d) {
  const paid = Number(d.paid_amount) || 0;
  if (d.paid_date && paid > 0) return paid >= vatTotalOf(d) ? "done" : "partial";
  if (!d.invoice_date) return "no_invoice";
  return "unpaid";
}

// 상태별 라벨/색
const ST = {
  no_invoice: { label: "미발행", cls: "bg-ink/10 text-ink/50" },
  unpaid: { label: "미입금", cls: "bg-amber-100 text-amber-700" },
  partial: { label: "부분입금", cls: "bg-orange-100 text-orange-700" },
  done: { label: "완납", cls: "bg-green-100 text-green-700" },
};

const FILTERS = [
  { v: "all", label: "전체" },
  { v: "no_invoice", label: "미발행" },
  { v: "unpaid", label: "미입금" },
  { v: "partial", label: "부분입금" },
  { v: "done", label: "완납" },
];

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const monthOf = (d) => (d.event_start || d.created_at || "").slice(0, 7);

export default function SettlementManager({ deals }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [allMonths, setAllMonths] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [openInvoice, setOpenInvoice] = useState(null);
  const [openPay, setOpenPay] = useState(null);
  const [openMemo, setOpenMemo] = useState(null);
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      deals.map((d) => [
        d.id,
        {
          invoice_date: d.invoice_date || "",
          paid_date: d.paid_date || "",
          paid_amount: d.paid_amount != null ? String(d.paid_amount) : "",
          settle_memo: d.settle_memo || "",
        },
      ])
    )
  );

  const setField = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));

  // 전달된 항목만 저장 (계산서 / 입금 각각 독립)
  const commit = (d, fields, after) =>
    startTransition(async () => {
      const res = await updateSettlement(d.id, fields);
      if (res?.error) {
        alert(res.error);
        return;
      }
      setRows((r) => {
        const cur = { ...r[d.id] };
        if ("invoice_date" in fields) cur.invoice_date = fields.invoice_date || "";
        if ("paid_date" in fields) cur.paid_date = fields.paid_date || "";
        if ("paid_amount" in fields) cur.paid_amount = fields.paid_amount ? String(fields.paid_amount) : "";
        if ("settle_memo" in fields) cur.settle_memo = fields.settle_memo || "";
        return { ...r, [d.id]: cur };
      });
      after?.();
      router.refresh();
    });

  const q = query.trim().toLowerCase();
  const monthDeals = useMemo(() => {
    // 검색 중이면 월/전체 무시하고 전체에서 검색
    const scope = q || allMonths ? deals : deals.filter((d) => monthOf(d) === month);
    if (!q) return scope;
    return scope.filter((d) =>
      [d.company_name, d.contact_name, d.name, d.phone]
        .some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [deals, allMonths, month, q]);
  const filtered = useMemo(
    () => (filter === "all" ? monthDeals : monthDeals.filter((d) => statusOf(d) === filter)),
    [monthDeals, filter]
  );
  const counts = useMemo(() => {
    const c = { all: monthDeals.length, no_invoice: 0, unpaid: 0, partial: 0, done: 0 };
    for (const d of monthDeals) c[statusOf(d)]++;
    return c;
  }, [monthDeals]);
  const sum = useMemo(() => {
    let contract = 0, paid = 0, vat = 0;
    for (const d of monthDeals) {
      contract += Number(d.contract_amount) || 0;
      paid += Number(d.paid_amount) || 0;
      vat += vatTotalOf(d);
    }
    return { contract, paid, vat, unpaid: vat - paid };
  }, [monthDeals]);

  const label = (d) =>
    [d.company_name || d.contact_name || d.name || "고객", d.product].filter(Boolean).join(" · ");

  const exportCSV = () => {
    const head = [
      "업체명", "담당자", "연락처", "행사일", "견적(공급가)", "청구(VAT포함)",
      "실입금", "미수금", "계산서발행일", "계산서처리", "입금일", "입금액", "입금처리", "상태", "비고",
    ];
    const body = filtered.map((d) => {
      const vat = vatTotalOf(d);
      const paid = Number(d.paid_amount) || 0;
      return [
        d.company_name || "", d.contact_name || d.name || "", d.phone || "",
        d.event_start || "", Number(d.quoted_amount) || 0, vat, paid, vat - paid,
        d.invoice_date || "",
        [d.invoice_by, d.invoice_at ? fmtStamp(d.invoice_at) : ""].filter(Boolean).join(" "),
        d.paid_date || "", paid,
        [d.paid_by, d.paid_at ? fmtStamp(d.paid_at) : ""].filter(Boolean).join(" "),
        ST[statusOf(d)]?.label || "",
        d.settle_memo || "",
      ];
    });
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "﻿" + [head, ...body].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `정산_${q ? query.trim() : allMonths ? "전체" : month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      {/* 월 네비 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm font-bold text-ink">정산 목록</p>
        <button
          type="button"
          disabled={allMonths}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink/60 hover:bg-ink/5 disabled:opacity-30"
        >
          ‹
        </button>
        <span className={`text-sm font-bold ${allMonths ? "text-ink/30" : "text-ink"}`}>
          {month.replace("-", ". ")}
        </span>
        <button
          type="button"
          disabled={allMonths}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink/60 hover:bg-ink/5 disabled:opacity-30"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setAllMonths((v) => !v)}
          className={`rounded-md px-2.5 py-1 text-xs font-bold ${
            allMonths ? "bg-ink text-white" : "border border-ink/15 text-ink/60 hover:bg-ink/5"
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="rounded-md border border-ink/15 px-2.5 py-1 text-xs font-bold text-ink/60 hover:bg-ink/5 disabled:opacity-40"
        >
          CSV 내보내기
        </button>
        {/* 이 범위 합계 */}
        <span className="ml-auto text-xs text-ink/50">
          계약 <b className="text-ink">₩{won(sum.contract)}</b> · 실입금{" "}
          <b className="text-green-700">₩{won(sum.paid)}</b> · 미수{" "}
          <b className={sum.unpaid > 0 ? "text-red-600" : "text-ink/50"}>₩{won(sum.unpaid)}</b>
        </span>
      </div>

      {/* 검색 */}
      <div className="mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="업체명·담당자·연락처 검색"
          className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink/40">
          {q ? `'${query.trim()}' 검색` : allMonths ? "전체 기간" : `${month.replace("-", ". ")} 기준`}
        </span>
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
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{label(d)}</span>
                  {d.event_start && <span className="text-xs text-ink/40">{d.event_start}</span>}
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${ST[st].cls}`}>
                    {ST[st].label}
                  </span>
                </div>
                {(d.contact_name || d.phone) && (
                  <p className="mb-2 text-xs text-ink/45">
                    {d.contact_name}
                    {d.contact_name && d.phone ? " · " : ""}
                    {d.phone}
                  </p>
                )}

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

                {/* 비고 */}
                {openMemo === d.id ? (
                  <div className="mb-2 flex items-center gap-1.5">
                    <input
                      value={r.settle_memo}
                      onChange={(e) => setField(d.id, "settle_memo", e.target.value)}
                      placeholder="정산 비고 (예: 세금계산서 이메일 발송, 카드결제 등)"
                      className="flex-1 rounded-md border border-ink/15 px-2 py-1 text-xs outline-none focus:border-primary"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => commit(d, { settle_memo: r.settle_memo }, () => setOpenMemo(null))}
                      className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold text-white"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenMemo(null)}
                      className="rounded-md border border-ink/15 px-2 py-1 text-xs text-ink/50"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setField(d.id, "settle_memo", d.settle_memo || "");
                      setOpenMemo(d.id);
                    }}
                    className="mb-2 block w-full rounded-md bg-ink/[0.03] px-2 py-1 text-left text-xs text-ink/70 hover:bg-ink/[0.06]"
                  >
                    <span className="font-bold text-ink/50">비고</span>{" "}
                    {d.settle_memo || <span className="text-ink/35">(클릭해 입력)</span>}
                  </button>
                )}

                {/* 계산서 발행 */}
                <div className="flex flex-wrap items-center gap-2">
                  {d.invoice_date ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      계산서 {d.invoice_date}
                      {(d.invoice_by || d.invoice_at) && (
                        <span className="text-indigo-400">
                          · {d.invoice_by}
                          {d.invoice_at ? ` ${fmtStamp(d.invoice_at)}` : ""}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-ink/40">계산서 미발행</span>
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
                      입금 {d.paid_date} · ₩ {won(d.paid_amount)}
                      {(d.paid_by || d.paid_at) && (
                        <span className="text-green-500">
                          · {d.paid_by}
                          {d.paid_at ? ` ${fmtStamp(d.paid_at)}` : ""}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-ink/40">미입금</span>
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
                        onClick={() => commit(d, { invoice_date: r.invoice_date }, () => setOpenInvoice(null))}
                        className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black"
                      >
                        저장
                      </button>
                      {d.invoice_date && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => commit(d, { invoice_date: null }, () => setOpenInvoice(null))}
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
                        onClick={() => commit(d, { paid_date: r.paid_date, paid_amount: r.paid_amount }, () => setOpenPay(null))}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                      >
                        확인
                      </button>
                      {d.paid_date && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => commit(d, { paid_date: null, paid_amount: null }, () => setOpenPay(null))}
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
