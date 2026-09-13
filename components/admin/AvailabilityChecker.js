"use client";

import { useMemo, useState } from "react";
import { availableFor, matchCategory } from "@/lib/inventory";

// 견적 전달 전 재고 확인 (읽기 전용) — 확정된 일정 예약분과 대조
// 점유 기준은 납품~회수지만, 견적 단계에선 행사 날짜로 미리 가늠
export default function AvailabilityChecker({
  totals = {},
  categories = [],
  items = [],
  schedById = {},
  defaultCategory = "",
  defaultStart = "",
  defaultEnd = "",
}) {
  const [cat, setCat] = useState(() => matchCategory(defaultCategory, categories));
  const [qty, setQty] = useState("1");
  const [start, setStart] = useState(defaultStart || "");
  const [end, setEnd] = useState(defaultEnd || defaultStart || "");

  const avail = useMemo(() => {
    if (!cat || !start) return null;
    return availableFor(totals, items, schedById, cat, start, end || start, null);
  }, [cat, start, end, totals, items, schedById]);

  const qtyNum = parseInt(qty, 10) || 0;
  const over = avail && qtyNum > avail.available;

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold text-ink/60">재고 확인 (전달 전)</p>
        {defaultCategory && (
          <span className="text-[11px] text-ink/45">
            고객 요청: <b className="text-ink/70">{defaultCategory}</b>
            {cat && (
              <>
                {" "}→ <b className="text-blue-700">{cat}</b>로 인식
              </>
            )}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-md border border-ink/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value="">기기 종류</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-16 rounded-md border border-ink/15 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        />
        <span className="text-sm text-ink/50">대</span>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-md border border-ink/15 px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <span className="text-ink/40">~</span>
        <input
          type="date"
          value={end}
          min={start || undefined}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-md border border-ink/15 px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      {avail && (
        <p
          className={`mt-2 text-xs font-medium ${
            avail.total === 0 || avail.available <= 0 || over
              ? "text-primary"
              : "text-green-600"
          }`}
        >
          {avail.total === 0
            ? `'${cat}' 보유 기기가 없습니다 (재고 관리에서 등록).`
            : avail.available <= 0
            ? `이 기간 '${cat}' 재고 없음 — 보유 ${avail.total}대 모두 예약됨. 스케줄 불가.`
            : over
            ? `이 기간 '${cat}' 가용 ${avail.available}대 — 요청 ${qtyNum}대는 부족.`
            : `이 기간 '${cat}' 가용 ${avail.available}대 / 보유 ${avail.total}대 → ${qtyNum}대 스케줄 가능.`}
        </p>
      )}
      {!avail && (
        <p className="mt-2 text-xs text-ink/40">종류와 날짜를 고르면 가용 재고를 확인합니다.</p>
      )}
    </div>
  );
}
