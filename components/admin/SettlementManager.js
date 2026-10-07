"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import {
  updateSettlement,
  addPayment,
  deletePayment,
} from "@/app/admin/(panel)/stats/actions";

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
const PAGE_SIZE = 30;

export default function SettlementManager({ deals, initialFocusId = null }) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [allMonths, setAllMonths] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
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

  // 다른 패널(발행 계산서 내역)이나 계산기에서 넘어온 건으로 이동
  const [focusId, setFocusId] = useState(initialFocusId);

  // 목록은 행사월로 걸러져 있어 그냥 스크롤만 하면 안 보일 수 있다.
  // 필터를 풀고 그 건의 행사월로 옮긴 뒤 찾아간다.
  const focusTo = (d) => {
    setFilter("all");
    setQuery("");
    setAllMonths(false);
    setMonth(monthOf(d));
    setFocusId(d.id);
  };

  // 입금 추가 폼 (건별 임시값) — 계약금·잔금처럼 여러 번 받는 경우가 있다
  const [payForm, setPayForm] = useState({});
  const setPay = (id, k, v) =>
    setPayForm((f) => ({ ...f, [id]: { ...(f[id] || {}), [k]: v } }));

  // payments 가 있으면 그 합계, 없으면 기존 컬럼 하나를 쓴다
  const paysOf = (d) => (Array.isArray(d.payments) ? d.payments : []);
  const paidSumOf = (d) => {
    const list = paysOf(d);
    if (list.length > 0) return list.reduce((a, x) => a + (Number(x.amount) || 0), 0);
    return Number(d.paid_amount) || 0;
  };

  const addPay = (d, after) =>
    startTransition(async () => {
      const f = payForm[d.id] || {};
      const res = await addPayment(d.id, {
        paid_date: f.date,
        amount: f.amount,
        memo: f.memo,
      });
      if (res?.error) {
        alert(res.error);
        return;
      }
      setPayForm((x) => ({ ...x, [d.id]: {} }));
      after?.();
      router.refresh();
    });

  const delPay = (pid) =>
    startTransition(async () => {
      const res = await deletePayment(pid);
      if (res?.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });

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
    // 건수: 계약=전체 건, 실입금=입금액이 있는 건, 미수=부가세 포함 금액에서 입금액을 뺀 값이 남은 건
    // 내역: 완납(입금액 ≥ 부가세 포함 금액) / 부분입금 / 입금 전 — 실입금=완납+부분, 미수=입금 전+부분
    let nFull = 0, nPartial = 0, nNone = 0;
    for (const d of monthDeals) {
      const p = Number(d.paid_amount) || 0;
      contract += Number(d.contract_amount) || 0;
      paid += p;
      vat += vatTotalOf(d);
      if (p <= 0) nNone++;
      else if (p >= vatTotalOf(d)) nFull++;
      else nPartial++;
    }
    return {
      contract,
      paid,
      vat,
      unpaid: vat - paid,
      nContract: monthDeals.length,
      nPaid: nFull + nPartial,
      nUnpaid: nNone + nPartial,
      nFull,
      nPartial,
      nNone,
    };
  }, [monthDeals]);

  // 이 달에 '발행한' 계산서 — 목록은 행사월로 거르지만 이건 발행일 기준이라
  // 전체 건에서 따로 센다. 부가세 신고·세무 정리 때 보는 숫자다.
  const issued = useMemo(() => {
    const rows = deals
      .filter(
        (d) =>
          (d.invoice_date || "").slice(0, 7) === month &&
          Number(d.contract_amount) > 0
      )
      .sort((a, b) => (a.invoice_date < b.invoice_date ? -1 : 1));
    const supply = rows.reduce((a, d) => a + (Number(d.contract_amount) || 0), 0);
    return { rows, supply, vat: Math.round(supply * 1.1) };
  }, [deals, month]);

  // 필터/월/검색 바뀌면 첫 페이지로
  useEffect(() => {
    setPage(1);
  }, [month, allMonths, filter, q]);

  // 대상이 몇 페이지에 있는지 계산해 그 페이지로 옮기고, 그려진 뒤 스크롤한다.
  useEffect(() => {
    if (!focusId) return;
    const i = filtered.findIndex((d) => d.id === focusId);
    if (i < 0) return;
    const want = Math.floor(i / PAGE_SIZE) + 1;
    if (want !== curPage) {
      setPage(want);
      return; // 페이지가 바뀌면 다시 들어와 스크롤한다
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const el = document.getElementById(`settle-${focusId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        clearInterval(timer);
        // 하이라이트는 잠깐만
        setTimeout(() => setFocusId(null), 2000);
        return;
      }
      if (tries >= 20) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [focusId, filtered, curPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);


  const pageNums = [];
  for (let i = Math.max(1, curPage - 2); i <= Math.min(totalPages, curPage + 2); i++)
    pageNums.push(i);

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
        {/* 이번 달: 전체 보기를 끄고 이번 달로 돌아옴. 이미 이번 달을 보는 중이면 켜진 모양 */}
        <button
          type="button"
          onClick={() => {
            setAllMonths(false);
            setMonth(todayStr().slice(0, 7));
          }}
          className={`rounded-md px-2.5 py-1 text-xs font-bold ${
            !allMonths && month === todayStr().slice(0, 7)
              ? "bg-ink text-white"
              : "border border-ink/15 text-ink/60 hover:bg-ink/5"
          }`}
        >
          이번 달
        </button>
        <button
          type="button"
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="rounded-md border border-ink/15 px-2.5 py-1 text-xs font-bold text-ink/60 hover:bg-ink/5 disabled:opacity-40"
        >
          CSV 내보내기
        </button>
        {/* 이 범위 합계 — 공급가와 VAT 포함 청구액을 함께 보여준다.
            미수 = 청구(VAT) - 실입금 이라, 청구액이 보여야 숫자가 맞아떨어진다. */}
        <div className="ml-auto text-xs leading-relaxed text-ink/50 sm:text-right">
          {/* 1줄: 청구 기준 금액 */}
          <p>
            공급가 <b className="text-ink">₩{won(sum.contract)}</b>
            <span className="text-ink/40"> ({sum.nContract}건)</span>
            <span className="px-1 text-ink/25">·</span>
            청구(VAT) <b className="text-ink">₩{won(sum.vat)}</b>
          </p>
          {/* 2줄: 받은 돈 / 남은 돈 */}
          <p>
            실입금 <b className="text-green-700">₩{won(sum.paid)}</b>
            <span className="text-ink/40">
              {" "}({sum.nPaid}건 · 완납 {sum.nFull} · 부분 {sum.nPartial})
            </span>
            <span className="px-1 text-ink/25">·</span>
            미수{" "}
            <b className={sum.unpaid > 0 ? "text-red-600" : "text-ink/50"}>₩{won(sum.unpaid)}</b>
            <span className="text-ink/40">
              {" "}({sum.nUnpaid}건 · 입금 전 {sum.nNone} · 부분 {sum.nPartial})
            </span>
          </p>
        </div>
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
          {paged.map((d) => {
            const r = rows[d.id];
            const vat = vatTotalOf(d);
            const paidSaved = Number(d.paid_amount) || 0;
            const unpaid = vat - paidSaved;
            const st = statusOf(d);
            return (
              <li
                key={d.id}
                id={`settle-${d.id}`}
                className={`rounded-xl border p-3 transition ${
                  focusId === d.id
                    ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30"
                    : "border-ink/10"
                }`}
              >
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
                  {paidSumOf(d) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      {paysOf(d).length > 1
                        ? `입금 ${paysOf(d).length}건 · ₩ ${won(paidSumOf(d))}`
                        : `입금 ${paysOf(d)[0]?.paid_date || d.paid_date} · ₩ ${won(paidSumOf(d))}`}
                      {paidSumOf(d) < vat && (
                        <span className="font-bold text-orange-600">
                          · 미수 ₩ {won(vat - paidSumOf(d))}
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
                        // 남은 금액을 기본값으로 — 보통 잔금을 그대로 받는다
                        const rest = Math.max(0, vat - paidSumOf(d));
                        setPay(d.id, "date", todayStr());
                        setPay(d.id, "amount", rest > 0 ? String(rest) : "");
                        setOpenPay(d.id);
                      }
                    }}
                    className="rounded-md border border-green-300 px-2.5 py-1 text-xs font-bold text-green-700 hover:bg-green-50"
                  >
                    {paidSumOf(d) > 0 ? "입금 내역" : "입금 확인"}
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
                    <p className="mb-2 text-xs font-bold text-ink/60">
                      입금 내역{" "}
                      <span className="font-normal text-ink/45">
                        (청구 부가세 포함 ₩ {won(vat)})
                      </span>
                    </p>

                    {/* 받은 내역 — 계약금·잔금처럼 여러 번 받으면 줄이 늘어난다 */}
                    {paysOf(d).length > 0 && (
                      <ul className="mb-2 divide-y divide-green-200/60 rounded-md border border-green-200 bg-white">
                        {paysOf(d).map((x) => (
                          <li
                            key={x.id ?? x.paid_date}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-xs"
                          >
                            <span className="w-24 shrink-0 tabular-nums text-ink/70">
                              {x.paid_date}
                            </span>
                            <span className="w-28 shrink-0 text-right font-bold tabular-nums text-ink">
                              ₩ {won(x.amount)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-ink/45">
                              {x.memo || ""}
                              {x.created_by ? ` · ${x.created_by}` : ""}
                            </span>
                            {x.id && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => {
                                  if (confirm(`${x.paid_date} ₩ ${won(x.amount)} 입금을 삭제할까요?`))
                                    delPay(x.id);
                                }}
                                title="이 입금 삭제"
                                className="shrink-0 rounded px-1.5 text-sm text-ink/30 hover:bg-red-50 hover:text-red-600"
                              >
                                ×
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* 합계 / 미수 */}
                    {paidSumOf(d) > 0 && (
                      <p className="mb-2 text-xs text-ink/60">
                        합계 <b className="text-green-700">₩ {won(paidSumOf(d))}</b>
                        {paidSumOf(d) < vat ? (
                          <>
                            {" · "}미수{" "}
                            <b className="text-orange-600">₩ {won(vat - paidSumOf(d))}</b>
                          </>
                        ) : (
                          <span className="ml-1 font-bold text-green-700">· 완납</span>
                        )}
                      </p>
                    )}

                    {/* 입금 추가 */}
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-xs text-ink/50">
                        입금일
                        <div className="mt-0.5 w-36">
                          <DatePicker
                            value={payForm[d.id]?.date || ""}
                            onChange={(v) => setPay(d.id, "date", v)}
                          />
                        </div>
                      </label>
                      <label className="text-xs text-ink/50">
                        입금액 (부가세 포함)
                        {/* 남은 금액이 미리 채워져 있다. 누르면 전체 선택되어
                            새로 치는 숫자가 뒤에 붙지 않고 덮어쓰인다. */}
                        <input
                          inputMode="numeric"
                          value={
                            payForm[d.id]?.amount
                              ? Number(digits(payForm[d.id].amount)).toLocaleString("ko-KR")
                              : ""
                          }
                          onChange={(e) => setPay(d.id, "amount", digits(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="mt-0.5 block w-32 rounded-md border border-ink/15 px-2 py-1.5 text-right text-sm font-bold outline-none focus:border-primary"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => addPay(d)}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                      >
                        + 입금 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenPay(null)}
                        className="rounded-md border border-ink/15 px-2.5 py-1.5 text-xs text-ink/50 hover:bg-ink/5"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <button
            type="button"
            disabled={curPage === 1}
            onClick={() => setPage(curPage - 1)}
            className="flex h-8 min-w-8 items-center justify-center rounded-md border border-ink/15 text-sm text-ink/70 hover:bg-ink/5 disabled:opacity-30"
          >
            ‹
          </button>
          {pageNums.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm ${
                n === curPage
                  ? "bg-ink font-bold text-white"
                  : "border border-ink/15 text-ink/70 hover:bg-ink/5"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={curPage === totalPages}
            onClick={() => setPage(curPage + 1)}
            className="flex h-8 min-w-8 items-center justify-center rounded-md border border-ink/15 text-sm text-ink/70 hover:bg-ink/5 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}

      {/* 이 달 발행한 계산서 — 위 목록(행사월)과 달리 발행일 기준이라 따로 둔다 */}
      {!allMonths && !q && (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-ink/[0.02] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-bold text-ink/70">
              {month.replace("-", ". ")} 발행 계산서
              <span className="ml-1.5 text-xs font-normal text-ink/40">발행일 기준</span>
            </span>
            <span className="shrink-0 text-xs text-ink/45">{issued.rows.length}건</span>
          </div>

          {issued.rows.length > 0 ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
                <span className="text-ink/60">
                  공급가 <b className="text-ink">₩ {won(issued.supply)}</b>
                </span>
                <span className="text-ink/60">
                  청구액 <span className="text-xs text-ink/40">부가세 포함</span>{" "}
                  <b className="text-ink">₩ {won(issued.vat)}</b>
                </span>
              </div>
              <details className="mt-1">
                <summary className="cursor-pointer py-1 text-xs font-bold text-ink/50">
                  내역 보기
                </summary>
                <ul className="mt-2 divide-y divide-ink/5 text-sm">
                  {issued.rows.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => focusTo(d)}
                        title="정산 목록에서 이 건 보기"
                        className="flex w-full items-baseline justify-between gap-3 rounded px-1 py-1.5 text-left transition hover:bg-primary/5"
                      >
                        <span className="min-w-0 truncate text-ink/70">
                          {d.company_name || d.contact_name || "(업체명 없음)"}
                          <span className="ml-1.5 text-xs text-ink/35">{d.invoice_date}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-ink">
                          ₩ {won(d.contract_amount)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/40">이 달에 발행한 계산서가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
