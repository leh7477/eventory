"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SITE } from "@/lib/constants";
import { saveQuotedAmount } from "@/app/admin/(panel)/inquiries/actions";
import { matchCategory, parseQty } from "@/lib/inventory";

// 품목명에서 수량·단위 제거 (예: '스탑워치 2대' → '스탑워치')
function stripQty(s) {
  return String(s || "")
    .replace(/\d+\s*(?:대|개|세트|셋트|ea|pcs|set)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

export default function QuoteSheet({ inquiry, rates = { shipping: [], rental: [] } }) {
  const days = daysBetween(inquiry.event_start, inquiry.event_end);
  const period =
    inquiry.event_start || inquiry.event_end
      ? `${inquiry.event_start ?? "?"} ~ ${inquiry.event_end ?? "?"}${days ? ` (${days}일)` : ""}`
      : "";
  const location = [inquiry.address, inquiry.address_detail]
    .filter(Boolean)
    .join(" ");

  // 제작 요청 건은 대여 단가표를 읽지 않음 (배송비는 그대로 자동)
  const isMade = inquiry.usage === "제작";
  // 단가표
  const rentalRates = isMade ? [] : rates?.rental ?? [];
  const shippingRates = rates?.shipping ?? [];
  // 행사 일수 → 단가표 열 인덱스(1~14일), 일수 미상이면 1일 기준
  const dayIdx = days ? Math.min(Math.max(days, 1), 14) - 1 : 0;

  // 문의 제품 → 대여 단가표 항목 (스탑/스톱 오타·수량 표기 무관하게 매칭)
  const rentalNames = rentalRates.map((r) => r.product);
  const matchRental = (name) => {
    const hit = matchCategory(name, rentalNames);
    return hit ? rentalRates.find((r) => r.product === hit) || null : null;
  };
  const priceOf = (r) => {
    const v = r?.prices?.[dayIdx];
    return v == null ? "" : String(v);
  };

  // 품목: 문의 제품으로 1행 프리필. 이름은 수량 제외, 수량은 별도 칸, 단가는 단가표에서 자동
  const firstMatch = inquiry.product ? matchRental(inquiry.product) : null;
  const firstQty = parseQty(inquiry.product) || 1;
  // 단가표에 매칭되면 우리 카테고리명으로, 아니면 고객 입력(수량 제외)
  const firstName = firstMatch ? firstMatch.product : stripQty(inquiry.product);
  const [items, setItems] = useState([
    {
      name: firstName
        ? `${firstName} ${isMade ? "제작" : `렌탈${days ? ` (${days}일)` : ""}`}`
        : "",
      qty: firstQty,
      price: firstMatch ? priceOf(firstMatch) : "",
    },
  ]);
  // 배송료 지역/방식 선택 (주소로 초기 지역 추정 → 배송비 자동 대입)
  const guessRegion = () => {
    const addr = location;
    if (!addr) return "";
    let best = "";
    for (const s of shippingRates) {
      const tail = s.region.split(" ").pop();
      if ((addr.includes(s.region) || (tail && addr.includes(tail))) && s.region.length > best.length)
        best = s.region;
    }
    return best;
  };
  const initRegion = guessRegion();
  const initS = shippingRates.find((x) => x.region === initRegion);
  // 기본은 '직접' (해당 지역에 직접가가 없을 때만 퀵)
  const initMethod = initS && initS.direct_fee == null ? "quick" : "direct";
  const initFee = initS ? (initMethod === "quick" ? initS.quick_fee : initS.direct_fee) : null;

  const [shipping, setShipping] = useState(initFee != null ? String(initFee) : ""); // 배송비
  const [shipRegion, setShipRegion] = useState(initRegion);
  const [shipMethod, setShipMethod] = useState(initMethod);

  const applyShipping = (region, method) => {
    setShipRegion(region);
    setShipMethod(method);
    const s = shippingRates.find((x) => x.region === region);
    if (!s) return;
    const fee = method === "quick" ? s.quick_fee : s.direct_fee;
    if (fee != null) setShipping(String(fee));
  };

  const onRegionChange = (region) => {
    const s = shippingRates.find((x) => x.region === region);
    const method = s && s.direct_fee != null ? "direct" : "quick";
    applyShipping(region, s ? method : shipMethod);
  };

  const addRentalItem = (product) => {
    const r = rentalRates.find((x) => x.product === product);
    if (!r) return;
    setItems((rows) => [
      ...rows,
      {
        name: `${r.product} 렌탈${days ? ` (${days}일)` : ""}`,
        qty: 1,
        price: priceOf(r),
      },
    ]);
  };
  const [vatIncluded, setVatIncluded] = useState(true);
  const [note, setNote] = useState(
    "· 본 견적은 견적일로부터 30일간 유효합니다.\n· 예약은 계약금 입금 시 확정됩니다.\n· 행사 일정 변경·취소는 사전 협의 부탁드립니다.\n· '서비스' 표기 품목은 무상 증정이 아닌, 해당 장비와 함께 대여되는 구성품입니다."
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
  const addServiceItem = () =>
    setItems((rows) => [...rows, { name: "", qty: 1, price: "", service: true }]);
  const removeItem = (i) =>
    setItems((rows) => rows.filter((_, idx) => idx !== i));

  const amounts = items.map((r) =>
    r.service
      ? 0
      : (parseInt(r.qty, 10) || 0) * (parseInt(String(r.price).replace(/\D/g, ""), 10) || 0)
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
      {/* 제작 요청 알림 (인쇄 시 숨김) */}
      {isMade && (
        <div className="print-hide mb-3 rounded-xl border border-violet-300 bg-violet-50 px-4 py-3">
          <p className="text-sm font-bold text-violet-700">🛠 제작 요청 건입니다</p>
          <p className="mt-0.5 text-xs text-violet-700/80">
            대여가 아닌 제작 문의라 <b>대여 단가표는 자동 입력되지 않습니다</b>. 제작 단가를
            직접 입력해 주세요. (배송비는 자동으로 채워집니다)
          </p>
        </div>
      )}

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
            <p className="font-tesla text-base font-semibold tracking-[0.28em] text-ink">EVENT LAND</p>
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
              <th className="print-hide w-24" />
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
                  {r.service ? (
                    <span className="text-ink/45">서비스</span>
                  ) : (
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
                  )}
                </td>
                <td className="py-2 text-right font-medium text-ink">
                  {r.service ? <span className="text-ink">서비스</span> : won(amounts[i])}
                </td>
                <td className="print-hide py-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setItem(i, "service", !r.service)}
                      title="서비스(무료) 표기 전환"
                      className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        r.service ? "bg-primary/10 text-primary" : "text-ink/30 hover:text-ink/60"
                      }`}
                    >
                      서비스
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-xs text-ink/30 hover:text-primary"
                      aria-label="행 삭제"
                    >
                      ✕
                    </button>
                  </div>
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
              <td className="print-hide py-2 pl-2">
                {shippingRates.length > 0 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={shipRegion}
                      onChange={(e) => onRegionChange(e.target.value)}
                      className="max-w-[120px] rounded border border-ink/15 px-1.5 py-1 text-xs outline-none focus:border-primary"
                      title="배송 지역"
                    >
                      <option value="">지역 선택</option>
                      {shippingRates.map((s) => (
                        <option key={s.region} value={s.region}>
                          {s.region}
                        </option>
                      ))}
                    </select>
                    <select
                      value={shipMethod}
                      onChange={(e) => applyShipping(shipRegion, e.target.value)}
                      className="rounded border border-ink/15 px-1.5 py-1 text-xs outline-none focus:border-primary"
                      title="배송 방식"
                    >
                      <option value="direct">직접</option>
                      <option value="quick">퀵</option>
                    </select>
                  </div>
                )}
              </td>
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

        <div className="print-hide mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addItem}
            className="rounded-md border border-dashed border-ink/20 px-3 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5"
          >
            + 품목 추가
          </button>
          <button
            type="button"
            onClick={addServiceItem}
            className="rounded-md border border-dashed border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            + 서비스 품목
          </button>
          {rentalRates.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addRentalItem(e.target.value);
                e.target.value = "";
              }}
              className="rounded-md border border-dashed border-ink/25 px-2 py-1.5 text-xs font-medium text-ink/70 outline-none focus:border-primary"
              title={days ? `${days}일 기준 단가 자동 입력` : "1일 기준 단가 자동 입력"}
            >
              <option value="">＋ 단가표에서 추가{days ? ` (${days}일)` : ""}</option>
              {rentalRates.map((r) => (
                <option key={r.product} value={r.product}>
                  {r.product}
                  {priceOf(r) ? ` · ${won(Number(priceOf(r)))}원` : " · 미설정"}
                </option>
              ))}
            </select>
          )}
        </div>

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
        <p className="mt-2 text-center font-tesla text-lg font-semibold tracking-[0.3em] text-ink">
          EVENT LAND
        </p>
      </div>
    </div>
  );
}
