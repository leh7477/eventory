// 재고 가용 계산 (서버/클라이언트 공용, 순수 함수)
// 점유 기준: 일정의 설치~회수 기간(start_date ~ end_date)
// 정비 버퍼: 회수 다음날 1일까지 재고 불가(다음 설치 전 여유 겸용)
export const MAINT_BUFFER_DAYS = 1;

// 'YYYY-MM-DD' 에 n일 더하기
export function addDays(dateStr, n) {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// 고객이 쓴 제품명(자유 입력)을 등록된 종류에 근접 매칭
// 예: "가챠머신기", "가챠 머신 3대" → "가챠머신"
export function matchCategory(text, categories = []) {
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
  const t = norm(text);
  if (!t) return "";
  const exact = categories.find((c) => norm(c) === t);
  if (exact) return exact;
  const cand = categories
    .filter((c) => {
      const n = norm(c);
      return n && (t.includes(n) || n.includes(t));
    })
    .sort((a, b) => norm(b).length - norm(a).length);
  return cand[0] || "";
}

// 'YYYY-MM-DD' 범위의 날짜 배열 (최대 366일로 제한)
export function eachDay(start, end) {
  if (!start) return [];
  const s = new Date(start + "T00:00:00");
  const e = new Date((end || start) + "T00:00:00");
  if (isNaN(s) || isNaN(e) || e < s) return start ? [start] : [];
  const out = [];
  const cur = new Date(s);
  let guard = 0;
  while (cur <= e && guard < 366) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
}

// 특정 종류가 [start,end] 기간 중 '동시에' 최대 몇 대 예약돼 있는지 (excludeScheduleId 제외)
// 각 예약은 회수 다음날(+MAINT_BUFFER_DAYS)까지 점유로 간주. 후보 기간도 동일하게 확장.
// items: [{ schedule_id, category, quantity }]
// schedById: { [id]: { start_date, end_date } }
export function peakUsage(items, schedById, category, start, end, excludeScheduleId = null) {
  let peak = 0;
  const winEnd = addDays(end || start, MAINT_BUFFER_DAYS); // 후보도 회수+버퍼까지 확인
  for (const day of eachDay(start, winEnd)) {
    let sum = 0;
    for (const it of items) {
      if (it.category !== category) continue;
      if (excludeScheduleId && it.schedule_id === excludeScheduleId) continue;
      const s = schedById[it.schedule_id];
      if (!s) continue;
      const sStart = s.start_date;
      const sEnd = addDays(s.end_date || s.start_date, MAINT_BUFFER_DAYS); // 정비 버퍼 포함
      if (sStart && sStart <= day && day <= sEnd) sum += Number(it.quantity) || 0;
    }
    if (sum > peak) peak = sum;
  }
  return peak;
}

// 특정 종류의 가용 대수 = 전체 보유 - 해당 기간 다른 일정 최대 점유
export function availableFor(totals, items, schedById, category, start, end, excludeScheduleId = null) {
  const total = Number(totals[category]) || 0;
  const used = peakUsage(items, schedById, category, start, end, excludeScheduleId);
  return { total, used, available: total - used };
}
