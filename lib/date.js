// 한국시간(KST) 기준 날짜 헬퍼
// 서버가 UTC라도 오늘/이번 달을 한국 기준으로 정확히 계산하기 위함.
// (절대 시각 타임스탬프는 UTC로 저장하고 표시만 KST로 하면 됨 — 여기서 다루는 건 날짜 단위 판단용)
const TZ = "Asia/Seoul";

// Date → 'YYYY-MM-DD' (KST)
export function kstDate(d = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

// 오늘 'YYYY-MM-DD' (KST)
export function todayKST() {
  return kstDate();
}

// n일 뒤 'YYYY-MM-DD' (KST)
export function kstPlusDays(n, base = new Date()) {
  return kstDate(new Date(base.getTime() + n * 86400000));
}

// KST 기준 { ymd, year, month(1-12), ym('YYYY-MM') }
export function kstParts(d = new Date()) {
  const s = kstDate(d);
  return {
    ymd: s,
    year: s.slice(0, 4),
    month: parseInt(s.slice(5, 7), 10),
    ym: s.slice(0, 7),
  };
}
