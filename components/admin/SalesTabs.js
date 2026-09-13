"use client";

import { useState } from "react";

// 매출 관리 뷰 토글 (정산 / 통계) — children 순서대로 tabs와 매칭
export default function SalesTabs({ tabs = [], children, initial = 0 }) {
  const [i, setI] = useState(initial);
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-ink/10 bg-white p-0.5">
        {tabs.map((t, idx) => (
          <button
            key={t}
            type="button"
            onClick={() => setI(idx)}
            className={`rounded-md px-4 py-1.5 text-sm font-bold transition ${
              i === idx ? "bg-ink text-white" : "text-ink/50 hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {items.map((c, idx) => (
        <div key={idx} hidden={idx !== i}>
          {c}
        </div>
      ))}
    </div>
  );
}
