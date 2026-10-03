// 네 기둥(년·월·일·시) 계산. 외부 라이브러리 없이 율리우스일과 태양 황경에서 직접 구한다.
// 지원 범위: 한국 표준시가 UTC+9인 출생(1961-08-10 이후). 그 이전은 attention으로 표시만 한다.

export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export const gz = (i) => STEMS[((i % 10) + 10) % 10] + BRANCHES[((i % 12) + 12) % 12];

// 그레고리력 날짜 -> 율리우스일 번호
export function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
    - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// UTC ms -> 태양 겉보기 황경(도). Meeus 25장 저정밀식. 오차 약 0.01도 = 절기 시각으로 15분 안팎.
export function sunLongitude(utcMs) {
  const rad = Math.PI / 180;
  const T = (utcMs / 86400000 + 2440587.5 - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * rad;
  const lam = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return ((lam % 360) + 360) % 360;
}

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul', hourCycle: 'h23', year: 'numeric', month: 'numeric',
  day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});
function seoulOffsetMin(utcMs) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((x) => [x.type, +x.value]));
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000) / 60000;
}
// 서울 벽시계 시각 -> UTC ms (서머타임·옛 표준시는 시간대 자료가 처리)
export function seoulToUtc(y, m, d, hh, mi) {
  const wall = Date.UTC(y, m - 1, d, hh, mi);
  let utc = wall - 9 * 3600000;
  utc = wall - seoulOffsetMin(utc) * 60000;
  utc = wall - seoulOffsetMin(utc) * 60000;
  return utc;
}

// UTC 순간에서 네 기둥.
// hourShiftMin: 30이면 시 경계를 30분 늦춘다(辰시 = 07:30~09:30). 0이면 정시 경계.
// dayRollover: 'ziStart' = 子시가 시작될 때 날이 바뀐다. 'midnight' = 자정에 바뀐다(야자시·조자시 구분).
export function pillarsFromUtc(utcMs, { hourShiftMin = 30, dayRollover = 'ziStart' } = {}) {
  // 년·월: 태양 황경. 입춘(315도)에서 해가 바뀌고 30도마다 달이 바뀐다.
  const lam = sunLongitude(utcMs);
  const k = Math.floor((((lam - 315) % 360) + 360) % 360 / 30); // 0 = 寅월
  const g = new Date(utcMs + 9 * 3600000);
  let sy = g.getUTCFullYear();
  if (k >= 10 && g.getUTCMonth() + 1 <= 2) sy -= 1;
  const yearIdx = (((sy - 4) % 60) + 60) % 60;
  const monthIdx = ((yearIdx % 10) * 2 + 2 + k) % 10; // 천간
  const month = STEMS[monthIdx] + BRANCHES[(k + 2) % 12];

  // 일·시: 표준시 시계(UTC+9, 서머타임 제거)에서 경계 보정만큼 뺀 시계
  const adj = new Date(utcMs + 9 * 3600000 - hourShiftMin * 60000);
  const mins = adj.getUTCHours() * 60 + adj.getUTCMinutes();
  const baseDay = (jdn(adj.getUTCFullYear(), adj.getUTCMonth() + 1, adj.getUTCDate()) + 49) % 60;
  const lateZi = mins >= 23 * 60;
  const hourDay = lateZi ? baseDay + 1 : baseDay;
  const dayIdx = lateZi && dayRollover === 'ziStart' ? baseDay + 1 : baseDay;
  const hb = Math.floor(((mins + 60) % 1440) / 120);
  const hour = STEMS[((hourDay % 10) * 2 + hb) % 10] + BRANCHES[hb];

  return { year: gz(yearIdx), month, day: gz(dayIdx), hour, sunLongitude: lam };
}

export function pillars(y, m, d, hh, mi, opts) {
  const utc = seoulToUtc(y, m, d, hh, mi);
  const out = pillarsFromUtc(utc, opts);
  out.attention = utc < Date.UTC(1961, 7, 9, 15, 0) ? '1961-08-10 이전 출생: 표준시가 달라 미검증' : null;
  return out;
}

// 황경이 target도를 지나는 UTC ms를 [lo, hi] 안에서 이분법으로 찾는다.
export function crossing(target, lo, hi) {
  const f = (t) => ((((sunLongitude(t) - target) % 360) + 540) % 360) - 180;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
