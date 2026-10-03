// 방결 v3 규칙: 일간 → 오행, 월지 → 계절, 조후 용신표, 용신 → 방위·지형·기후, 두 일간의 관계, 다음 절기.
// 출처: 05 Board/2026-10-03 1115 대화 설계 v2 2절. 조후표는 상품용 단순화(가설).
import { sunLongitude, crossing } from './saju.mjs';

export const EL_OF_STEM = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
export const SEASON_OF_BRANCH = { 寅: '봄', 卯: '봄', 辰: '봄', 巳: '여름', 午: '여름', 未: '여름', 申: '가을', 酉: '가을', 戌: '가을', 亥: '겨울', 子: '겨울', 丑: '겨울' };

// 태어난 달을 말로. 寅월은 입춘 직후라 「이른 봄」.
export const SEASON_PHRASE = { 寅: '이른 봄에', 卯: '봄 한가운데', 辰: '봄 끝에', 巳: '여름 초입에', 午: '한여름에', 未: '여름 끝에', 申: '가을 초입에', 酉: '가을 한가운데', 戌: '가을 끝에', 亥: '겨울 초입에', 子: '한겨울에', 丑: '겨울 끝에' };

// 일간 열 가지: 비유 · 양면 문장(바넘용)
export const STEM_TEXT = {
  甲: { metaphor: '곧게 자라는 큰 나무', twoSided: '밖에서는 앞장서지만 집에서는 아무도 건드리지 않길 바라는 편' },
  乙: { metaphor: '담을 타고 오르는 풀', twoSided: '잘 맞춰 주는 사람인데 혼자 있을 자리가 없으면 금세 지치는 편' },
  丙: { metaphor: '한낮의 해', twoSided: '밖에서는 환하지만 집에 오면 그늘을 찾는 편' },
  丁: { metaphor: '밤의 촛불', twoSided: '조용히 오래 가는데 바람 한 번에 흔들리는 편' },
  戊: { metaphor: '큰 산', twoSided: '쉽게 안 움직이는데 한번 자리를 정하면 그 자리에 오래 묶이는 편' },
  己: { metaphor: '밭의 흙', twoSided: '남을 잘 받아 주는데 정작 자기 자리는 늘 뒤로 미루는 편' },
  庚: { metaphor: '단단한 바위', twoSided: '결정은 빠른데 결정한 뒤에 혼자 오래 되새기는 편' },
  辛: { metaphor: '작은 보석', twoSided: '작은 흠이 먼저 보이고 그게 밤까지 따라오는 편' },
  壬: { metaphor: '큰 강', twoSided: '넓게 흐르다가 막히면 한참 고이는 편' },
  癸: { metaphor: '조용한 비', twoSided: '조용히 스며드는데 어디에도 오래 못 머무는 편' },
};

// 조후 용신표: 일간 오행 × 월지. 설계 v2 2.2.
export function yongsin(dayStem, monthBranch) {
  const el = EL_OF_STEM[dayStem];
  const s = SEASON_OF_BRANCH[monthBranch];
  const table = {
    木: { 봄: monthBranch === '辰' ? '金' : '火', 여름: '水', 가을: '火', 겨울: '火' },
    火: { 봄: monthBranch === '寅' ? '木' : '水', 여름: '水', 가을: '木', 겨울: '木' },
    土: { 봄: '火', 여름: '水', 가을: '火', 겨울: '火' },
    金: { 봄: '土', 여름: '水', 가을: '火', 겨울: '火' },
    水: { 봄: '金', 여름: '金', 가을: '木', 겨울: '火' },
  };
  return table[el][s];
}

// 용신을 극하는 오행(피할 쪽)
export const CONTROLLER = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };
export const EL_NAME = { 木: '나무', 火: '해', 土: '흙', 金: '쇠', 水: '물' };
export const EL_VERB = { 金: '베는', 水: '끄는', 木: '뚫는', 火: '녹이는', 土: '막는' }; // 극하는 쪽이 하는 일
export const EL_VERB_DO = { 金: '베요', 水: '꺼요', 木: '뚫어요', 火: '녹여요', 土: '막아요' };

// 용신 → 방위·지형·기후·침대 옆에 두지 말 것. 설계 v2 2.3.
export const PLACE = {
  木: { dir: '동', terrain: '공원이나 가로수가 보이는 낮은 층', climate: '바람 불고 초록이 많은 곳, 봄이 긴 곳', bedside: ['거울', '금속 선반'], window: '동쪽 창' },
  火: { dir: '남', terrain: '빛이 많이 드는 남향의 높은 층', climate: '따뜻하고 건조한 곳, 해가 긴 곳', bedside: ['어항', '가습기'], window: '남쪽 창' },
  土: { dir: '남서', terrain: '언덕이나 평지의 오래된 동네, 중간 층', climate: '평야나 고원, 사계절이 뚜렷한 곳', bedside: ['큰 화분', '나무 가구 더미'], window: '남서쪽 창' },
  金: { dir: '서', terrain: '정돈된 신시가지의 높은 층', climate: '맑고 건조하고 서늘한 곳', bedside: ['붉은 조명', '양초'], window: '서쪽 창' },
  水: { dir: '북', terrain: '강이나 호수가 보이는 곳', climate: '서늘하고 습한 곳, 물이 가까운 곳', bedside: ['흙 화분', '돌이나 도자기 더미'], window: '북쪽 창' },
};
// 피할 방위·지형·기후 = 극하는 오행의 자리
export const AVOID = {
  木: { dir: '서', terrain: '역 바로 옆 높은 층', climate: '맑고 찬 곳' },
  火: { dir: '북', terrain: '물가의 그늘진 낮은 층', climate: '서늘하고 습한 곳' },
  土: { dir: '동', terrain: '숲에 묻힌 외딴 집', climate: '바람 많고 비 잦은 곳' },
  金: { dir: '남', terrain: '번화가 한복판의 남향', climate: '덥고 건조한 곳' },
  水: { dir: '남서', terrain: '언덕 위 흙마당 집', climate: '건조한 평야' },
};

export function place(yong) {
  const avoidEl = CONTROLLER[yong];
  return {
    yong, avoidEl,
    elName: EL_NAME[yong], avoidElName: EL_NAME[avoidEl], verb: EL_VERB[avoidEl], verbDo: EL_VERB_DO[avoidEl],
    ...PLACE[yong],
    avoidDir: AVOID[yong].dir, avoidTerrain: AVOID[yong].terrain, avoidClimate: AVOID[yong].climate,
  };
}

// 두 일간의 관계. 설계 v2 2.4. 순서: 합 → 충 → 생 → 극 → 닮음
const HAP = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
const CHUNG = ['甲庚', '乙辛', '丙壬', '丁癸'];
const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // a가 b를 낳는다
export function relation(myStem, myMonthBranch, otherStem) {
  const pair = myStem + otherStem, rev = otherStem + myStem;
  if (HAP.includes(pair) || HAP.includes(rev)) return '합';
  if (CHUNG.includes(pair) || CHUNG.includes(rev)) return '충';
  const myYong = yongsin(myStem, myMonthBranch);
  const otherEl = EL_OF_STEM[otherStem];
  if (otherEl === myYong) return '생';
  if (otherEl === CONTROLLER[myYong]) return '극';
  return '닮음';
}

// 다음 절(節): 황경 315도부터 30도마다. 지금부터 다음 것 하나.
const JIE = { 315: '입춘', 345: '경칩', 15: '청명', 45: '입하', 75: '망종', 105: '소서', 135: '입추', 165: '백로', 195: '한로', 225: '입동', 255: '대설', 285: '소한' };
export function nextTerm(nowMs = Date.now()) {
  const lam = sunLongitude(nowMs);
  const target = ((Math.floor((lam - 15) / 30) + 1) * 30 + 15) % 360;
  const t = crossing(target, nowMs, nowMs + 45 * 86400000);
  const d = new Date(t + 9 * 3600000);
  return { name: JIE[target], month: d.getUTCMonth() + 1, day: d.getUTCDate(), label: `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${JIE[target]}` };
}
