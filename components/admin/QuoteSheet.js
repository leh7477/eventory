"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SITE } from "@/lib/constants";
import { saveQuotedAmount } from "@/app/admin/(panel)/inquiries/actions";

// 행사 기간 일수 (시작~종료 포함)
function daysBetween(start, end) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e)) return null;
  const d = Math.round((e - s) / 86400000) + 1;
  return d > 0 ? d : null;
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const won = (n) => (isNaN(n) ? 0 : n).toLocaleString("ko-KR");

export default function QuoteSheet({ inquiry }) {
  const days = daysBetween(inquiry.event_start, inquiry.event_end);
  const period =
    inquiry.event_start || inquiry.event_end
      ? `${inquiry.event_start ?? "?"} ~ ${inquiry.event_end ?? "?"}${days ? ` (${days}일)` : ""}`
      : "";
  const location = [inquiry.address, inquiry.address_detail]
    .filter(Boolean)
    .join(" ");

  // 품목: 문의 제품으로 1행 프리필, 금액은 수동
  const [items, setItems] = useState([
    {
      name: inquiry.product
        ? `${inquiry.product} 렌탈${days ? ` (${days}일)` : ""}`
        : "",
      qty: 1,
      price: "",
    },
  ]);
  const [shipping, setShipping] = useState(""); // 배송비 (수량 없이 금액만)
  const [vatIncluded, setVatIncluded] = useState(true);
  const [note, setNote] = useState(
    "· 본 견적은 견적일로부터 30일간 유효합니다.\n· 예약은 계약금 입금 시 확정됩니다.\n· 행사 일정 변경·취소는 사전 협의 부탁드립니다."
  );
  const [quoteDate, setQuoteDate] = useState(todayStr());
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [savedMsg, setSavedMsg] = useState("");
  const [autoRecord, setAutoRecord] = useState(true); // 인쇄 시 견적 금액 자동 기록

  const recordQuote = () =>
    startSave(async () => {
      setSavedMsg("");
      const res = await saveQuotedAmount(inquiry.id, supply);
      setSavedMsg(res?.error || "견적 금액이 문의에 기록되었습니다");
      if (!res?.error) router.refresh();
    });

  const handlePrint = () => {
    if (autoRecord && supply > 0) recordQuote();
    window.print();
  };

  const setItem = (i, k, v) =>
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addItem = () =>
    setItems((rows) => [...rows, { name: "", qty: 1, price: "" }]);
  const removeItem = (i) =>
    setItems((rows) => rows.filter((_, idx) => idx !== i));

  const amounts = items.map(
    (r) => (parseInt(r.qty, 10) || 0) * (parseInt(String(r.price).replace(/\D/g, ""), 10) || 0)
  );
  const itemsTotal = amounts.reduce((a, b) => a + b, 0);
  const shippingFee = parseInt(String(shipping).replace(/\D/g, ""), 10) || 0;
  const supply = itemsTotal + shippingFee;
  const vat = vatIncluded ? Math.round(supply * 0.1) : 0;
  const total = supply + vat;

  const inputCls =
    "w-full rounded border border-ink/15 px-2 py-1 text-sm outline-none focus:border-primary print:border-0 print:p-0";

  return (
    <div>
      {/* 도구 바 (인쇄 시 숨김) */}
      <div className="print-hide mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-white p-3">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-md bg-ink px-5 py-2 text-sm font-bold text-white transition hover:bg-black"
        >
          인쇄 / PDF 저장
        </button>
        <label className="flex items-center gap-1.5 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={vatIncluded}
            onChange={(e) => setVatIncluded(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          부가세(10%) 별도 표기
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={autoRecord}
            onChange={(e) => setAutoRecord(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          견적 금액 자동 기록
        </label>
        {savedMsg ? (
          <span className="text-xs font-medium text-green-600">{savedMsg}</span>
        ) : (
          <span className="text-xs text-ink/40">
            인쇄 시 공급가액이 견적 금액으로 문의에 기록됩니다.
          </span>
        )}
      </div>

      {/* 견적서 본체 (A4) */}
      <div
        id="quote-sheet"
        className="rounded-xl border border-ink/10 bg-white p-8 print:rounded-none print:border-0 print:p-0"
      >
        <h2 className="text-center text-3xl font-extrabold tracking-[0.5em] text-ink">
          견 적 서
        </h2>

        {/* 상단: 수신 / 공급자 */}
        <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-20 py-1.5 text-ink/50">견적일자</td>
                  <td>
                    <input
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                      className={inputCls}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-ink/50">수신</td>
                  <td className="font-bold text-ink">
                    {inquiry.company_name || inquiry.name || "-"} 귀중
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-ink/50">담당자</td>
                  <td className="text-ink">{inquiry.contact_name || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-ink/50">연락처</td>
                  <td className="text-ink">{inquiry.phone || "-"}</td>
                </tr>
                {period && (
                  <tr>
                    <td className="py-1.5 text-ink/50">행사 기간</td>
                    <td className="text-ink">{period}</td>
                  </tr>
                )}
                {location && (
                  <tr>
                    <td className="py-1.5 text-ink/50">행사 장소</td>
                    <td className="text-ink">{location}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-ink/10 p-4">
            <p className="font-logo text-lg font-extrabold text-ink">EVENTORY</p>
            <table className="mt-2 w-full">
              <tbody>
                <tr>
                  <td className="w-24 py-1 text-ink/50">상호</td>
                  <td className="text-ink">{SITE.nameKo}</td>
                </tr>
                <tr>
                  <td className="py-1 text-ink/50">사업자번호</td>
                  <td className="text-ink">{SITE.bizNumber}</td>
                </tr>
                <tr>
                  <td className="py-1 text-ink/50">연락처</td>
                  <td className="text-ink">{SITE.phone}</td>
                </tr>
                <tr>
                  <td className="py-1 text-ink/50">이메일</td>
                  <td className="text-ink">{SITE.email}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 합계 금액 */}
        <p className="mt-8 border-y-2 border-ink py-3 text-center text-lg font-bold text-ink">
          합계 금액 : ₩ {won(total)} {vatIncluded ? "(VAT 포함)" : "(VAT 별도)"}
        </p>

        {/* 품목 표 */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink/60 text-left text-ink/60">
              <th className="py-2 font-medium">품목</th>
              <th className="w-16 py-2 text-center font-medium">수량</th>
              <th className="w-32 py-2 text-right font-medium">단가</th>
              <th className="w-32 py-2 text-right font-medium">금액</th>
              <th className="print-hide w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={i} className="border-b border-ink/10">
                <td className="py-2 pr-2">
                  <input
                    value={r.name}
                    onChange={(e) => setItem(i, "name", e.target.value)}
                    placeholder="품목명"
                    className={inputCls}
                  />
                </td>
                <td className="py-2 text-center">
                  <input
                    value={r.qty}
                    onChange={(e) =>
                      setItem(i, "qty", e.target.value.replace(/\D/g, ""))
                    }
                    className={`${inputCls} text-center`}
                  />
                </td>
                <td className="py-2 text-right">
                  <input
                    value={
                      r.price === ""
                        ? ""
                        : won(parseInt(String(r.price).replace(/\D/g, ""), 10) || 0)
                    }
                    onChange={(e) =>
                      setItem(i, "price", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0"
                    className={`${inputCls} text-right`}
                  />
                </td>
                <td className="py-2 text-right font-medium text-ink">
                  {won(amounts[i])}
                </td>
                <td className="print-hide py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs text-ink/30 hover:text-primary"
                    aria-label="행 삭제"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-b border-ink/10 text-ink">
              <td colSpan={3} className="py-2 text-right text-ink/60">
                배송비
              </td>
              <td className="py-2 text-right">
                <input
                  value={shipping === "" ? "" : won(shippingFee)}
                  onChange={(e) => setShipping(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className={`${inputCls} w-28 text-right font-medium`}
                />
              </td>
              <td className="print-hide" />
            </tr>
            <tr className="text-ink">
              <td colSpan={3} className="py-2 text-right text-ink/60">
                공급가액
              </td>
              <td className="py-2 text-right font-medium">{won(supply)}</td>
              <td className="print-hide" />
            </tr>
            {vatIncluded && (
              <tr className="text-ink">
                <td colSpan={3} className="py-1 text-right text-ink/60">
                  부가세 (10%)
                </td>
                <td className="py-1 text-right font-medium">{won(vat)}</td>
                <td className="print-hide" />
              </tr>
            )}
            <tr className="border-t-2 border-ink/60 text-ink">
              <td colSpan={3} className="py-2.5 text-right font-bold">
                총 합계
              </td>
              <td className="py-2.5 text-right text-base font-extrabold">
                ₩ {won(total)}
              </td>
              <td className="print-hide" />
            </tr>
          </tfoot>
        </table>

        <button
          type="button"
          onClick={addItem}
          className="print-hide mt-3 rounded-md border border-dashed border-ink/20 px-3 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5"
        >
          + 품목 추가
        </button>

        {/* 비고 */}
        <div className="mt-8">
          <p className="text-sm font-bold text-ink">비고</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={Math.max(3, note.split("\n").length + 1)}
            className="mt-2 w-full resize-y overflow-hidden rounded border border-ink/15 px-3 py-2 text-sm leading-relaxed text-ink/80 outline-none focus:border-primary print:resize-none print:border-0 print:p-0"
          />
        </div>

        <p className="mt-10 text-center text-sm text-ink/60">
          위와 같이 견적합니다.
        </p>
        <p className="mt-2 text-center font-logo text-xl font-extrabold text-ink">
          EVENTORY
        </p>
      </div>
    </div>
  );
}
