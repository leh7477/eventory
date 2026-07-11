"use client";

// 시/분 드롭다운 시간 선택 (value: "HH:MM" 또는 "")
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = [0, 10, 20, 30, 40, 50];

const hourLabel = (h) =>
  h === 0 ? "오전 12시" : h < 12 ? `오전 ${h}시` : h === 12 ? "오후 12시" : `오후 ${h - 12}시`;

export default function TimeSelect({ value, onChange, className = "" }) {
  const [h, m] = value ? value.split(":") : ["", ""];

  const selCls =
    "rounded-md border border-ink/15 px-2 py-2 text-sm outline-none focus:border-primary bg-white";

  const setHour = (nh) => {
    if (nh === "") return onChange("");
    onChange(`${nh}:${m || "00"}`);
  };
  const setMin = (nm) => {
    if (h === "") return;
    onChange(`${h}:${nm}`);
  };

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <select value={h} onChange={(e) => setHour(e.target.value)} className={`${selCls} flex-1`}>
        <option value="">시간 선택</option>
        {HOURS.map((hh) => (
          <option key={hh} value={String(hh).padStart(2, "0")}>
            {hourLabel(hh)}
          </option>
        ))}
      </select>
      <select
        value={m || "00"}
        onChange={(e) => setMin(e.target.value)}
        disabled={h === ""}
        className={`${selCls} w-20 disabled:opacity-40`}
      >
        {MINS.map((mm) => (
          <option key={mm} value={String(mm).padStart(2, "0")}>
            {String(mm).padStart(2, "0")}분
          </option>
        ))}
      </select>
    </div>
  );
}
