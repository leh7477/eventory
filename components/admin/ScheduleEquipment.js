"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { availableFor } from "@/lib/inventory";
import {
  setScheduleItem,
  removeScheduleItem,
} from "@/app/admin/(panel)/schedule/actions";

// 한 일정(납품~회수)에 대한 기기 배정 패널
export default function ScheduleEquipment({
  schedule,
  totals = {},
  categories = [],
  items = [],
  schedById = {},
}) {
  const router = useRouter();
  const [cat, setCat] = useState("");
  const [qty, setQty] = useState("1");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const start = schedule.start_date;
  const end = schedule.end_date || schedule.start_date;

  // 이 일정에 이미 배정된 항목
  const assigned = useMemo(
    () => items.filter((it) => it.schedule_id === schedule.id && it.quantity > 0),
    [items, schedule.id]
  );

  // 선택한 종류의 가용(이 일정 제외 기준 = 이 일정이 가질 수 있는 최대)
  const avail = useMemo(() => {
    if (!cat) return null;
    return availableFor(totals, items, schedById, cat, start, end, schedule.id);
  }, [cat, totals, items, schedById, start, end, schedule.id]);

  const run = (fn) =>
    startTransition(async () => {
      setError("");
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });

  const onAssign = () => {
    if (!cat) {
      setError("기기 종류를 선택하세요.");
      return;
    }
    run(async () => {
      const res = await setScheduleItem(schedule.id, cat, qty);
      if (!res?.error) {
        setCat("");
        setQty("1");
      }
      return res;
    });
  };

  const qtyNum = parseInt(qty, 10) || 0;
  const over = avail && qtyNum > avail.available;

  return (
    <div className="space-y-3 border-t border-ink/5 bg-blue-50/40 px-4 py-3">
      {/* 배정된 기기 */}
      {assigned.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {assigned.map((it) => (
            <span
              key={it.category}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-sm ring-1 ring-ink/10"
            >
              {it.category} <b className="text-blue-700">{it.quantity}대</b>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removeScheduleItem(schedule.id, it.category))}
                aria-label="배정 해제"
                className="ml-0.5 text-ink/30 hover:text-primary"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink/45">아직 배정된 기기가 없습니다.</p>
      )}

      {/* 배정 추가 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-md border border-ink/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value="">기기 종류 선택</option>
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
        <button
          type="button"
          disabled={pending || !cat || over}
          onClick={onAssign}
          className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
        >
          배정
        </button>

        {/* 가용 표시 */}
        {avail && (
          <span
            className={`text-xs font-medium ${
              avail.available <= 0
                ? "text-primary"
                : over
                ? "text-primary"
                : "text-green-600"
            }`}
          >
            {avail.total === 0
              ? "보유 기기 없음 (재고 관리에서 등록)"
              : avail.available <= 0
              ? `이 기간 '${cat}' 재고 없음 (보유 ${avail.total}대 모두 예약)`
              : over
              ? `가용 ${avail.available}대 — ${qtyNum}대는 초과`
              : `가용 ${avail.available}대 / 보유 ${avail.total}대 → 배정 가능`}
          </span>
        )}
      </div>

      {error && <p className="text-xs font-medium text-primary">{error}</p>}
    </div>
  );
}
