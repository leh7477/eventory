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
// 한글 음절 → 자모 분해 (초성/중성/종성). 오타·철자변형(예: 스탑/스톱) 비교용.
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
function toJamo(str) {
  let out = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172) {
      out += CHO[Math.floor(code / 588)];
      out += JUNG[Math.floor((code % 588) / 28)];
      const j = JONG[code % 28];
      if (j !== " ") out += j;
    } else {
      out += ch;
    }
  }
  return out;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// 문의 제품명 → 재고 카테고리 매칭.
// 수량·단위·용도 문구를 걷어내고, 포함관계 → 자모 유사도(오타 허용) 순으로 찾는다.
// (동의어 목록을 일일이 추가하지 않아도 '스탑워치 2대' → '스톱워치' 등이 잡힘)
export function matchCategory(text, categories = []) {
  const clean = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\d+/g, "") // 수량 숫자
      .replace(/(대여|렌탈|임대|대여용|제작|맞춤|세트|셋트|개|대|ea|pcs|set)/g, ""); // 단위·용도
  const t = clean(text);
  if (!t) return "";

  // 1) 완전일치
  const exact = categories.find((c) => clean(c) === t);
  if (exact) return exact;

  // 2) 포함관계 (더 긴 쪽 우선)
  const inc = categories
    .filter((c) => {
      const n = clean(c);
      return n && (t.includes(n) || n.includes(t));
    })
    .sort((a, b) => clean(b).length - clean(a).length);
  if (inc[0]) return inc[0];

  // 3) 자모 유사도 (오타·철자변형 허용). 가장 가까운 하나가 충분히 가까우면 채택.
  const tj = toJamo(t);
  let best = "";
  let bestRatio = Infinity;
  for (const c of categories) {
    const cj = toJamo(clean(c));
    if (!cj) continue;
    const ratio = levenshtein(tj, cj) / Math.max(tj.length, cj.length);
    if (ratio < bestRatio) {
      bestRatio = ratio;
      best = c;
    }
  }
  // 자모 기준 약 20% 이내 차이면 같은 품목으로 간주 (스탑/스톱, 사이 띄어쓰기·오타 등)
  return bestRatio <= 0.2 ? best : "";
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
