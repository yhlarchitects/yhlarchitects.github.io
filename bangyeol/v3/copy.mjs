// 방결 v3 문장: 네 질문 · 유도질문 12 · 무료 답 네 문장 · 잠금 · 990원 답 다섯 문장 · 카드.
// 출처: 05 Board/2026-10-03 1115 대화 설계 v2 3~5절.
import { STEM_TEXT, SEASON_PHRASE, yongsin, place, relation, nextTerm, EL_OF_STEM } from './rules.mjs';

export const QUESTIONS = [
  { id: 'sleep', title: '어느 쪽으로 누워 자야 기운이 풀릴까', short: '눕는 방향', two: false },
  { id: 'town', title: '어떤 도시, 어떤 동네에 살아야 할까', short: '도시와 동네', two: false },
  { id: 'country', title: '나는 어떤 나라가 잘 맞을까', short: '나라', two: false },
  { id: 'pair', title: '저 사람과 같이 살면 괜찮을까', short: '같이 살기', two: true },
];

// 유도질문: 질문당 3개. 각 선택지에 되비춤 한 줄과 되돌려 줄 꼬리말(tag).
export const GUIDES = {
  sleep: [
    { q: '쉬는 날 오후, 더 끌리는 쪽은', a: { label: '선선한 바람 부는 그늘에서 음악이나 명상', echo: '그늘을 고르는 사람은 자기 기운을 아끼는 사람이에요. 사주에도 그게 보여요.', tag: '그늘을 고르는 사람답게' }, b: { label: '햇살 아래 걷거나 뛰기', echo: '햇살을 고르는 사람은 기운을 밖에서 받아 오는 사람이에요. 사주에도 그게 보여요.', tag: '햇살을 고르는 사람답게' } },
    { q: '잠들기 전 머리에 남는 것은', a: { label: '내일 할 일', echo: '앞을 보는 걱정이네요. 방향이 중요한 사람이에요.', tag: '앞을 보는 사람답게' }, b: { label: '오늘 한 말', echo: '뒤를 보는 걱정이네요. 자리가 중요한 사람이에요.', tag: '뒤를 돌아보는 사람답게' } },
    { q: '자다가 깨면', a: { label: '시계를 본다', echo: '시간을 세는 사람은 밤이 길어요. 방향이 그걸 줄여요.', tag: '시간을 세는 사람답게' }, b: { label: '창밖을 본다', echo: '밖을 보는 사람은 자리가 불안한 거예요. 방향이 그걸 잡아요.', tag: '창밖을 보는 사람답게' } },
  ],
  town: [
    { q: '집에 들어오면 먼저', a: { label: '창문을 연다', echo: '공기를 먼저 바꾸는 사람은 머무는 자리에 민감해요. 사주에도 그게 보여요.', tag: '창문을 먼저 여는 사람답게' }, b: { label: '불을 켠다', echo: '빛을 먼저 켜는 사람은 어둠 속 불안을 아는 사람이에요. 사주에도 그게 보여요.', tag: '불을 먼저 켜는 사람답게' } },
    { q: '지금 집에서 제일 오래 있는 자리는', a: { label: '침대', echo: '눕는 자리가 중심인 사람이에요. 집은 쉬는 곳이에요.', tag: '침대가 중심인 사람답게' }, b: { label: '책상이나 식탁', echo: '앉는 자리가 중심인 사람이에요. 집은 버티는 곳이에요.', tag: '책상이 중심인 사람답게' } },
    { q: '지금 동네에서 가까운 것은', a: { label: '물이나 공원', echo: '자연 쪽에 사는 사람은 이미 기운을 반쯤 찾은 거예요.', tag: '공원 가까이 사는 사람답게' }, b: { label: '역이나 가게', echo: '편한 쪽에 사는 사람은 기운을 밖에서 사 오는 중이에요.', tag: '역 가까이 사는 사람답게' } },
  ],
  country: [
    { q: '낯선 도시에 내리면', a: { label: '먼저 걷는다', echo: '몸으로 먼저 재는 사람이에요. 땅이 맞으면 금방 알아요.', tag: '먼저 걷는 사람답게' }, b: { label: '먼저 앉을 데를 찾는다', echo: '자리부터 찾는 사람이에요. 땅이 안 맞으면 금방 지쳐요.', tag: '자리부터 찾는 사람답게' } },
    { q: '더위와 추위 중 못 견디는 것은', a: { label: '추위', echo: '추위를 못 견디는 사람은 불이 부족한 거예요.', tag: '추위를 피하는 사람답게' }, b: { label: '더위', echo: '더위를 못 견디는 사람은 물이 부족한 거예요.', tag: '더위를 피하는 사람답게' } },
    { q: '떠나고 싶은 마음은', a: { label: '자주, 조금씩', echo: '늘 조금씩 흔들리는 사람은 방위가 안 맞는 거예요.', tag: '조금씩 흔들리는 사람답게' }, b: { label: '가끔, 아주 세게', echo: '가끔 크게 흔들리는 사람은 계절이 안 맞는 거예요.', tag: '가끔 크게 흔들리는 사람답게' } },
  ],
  pair: [
    { q: '둘이 있을 때 먼저 말을 꺼내는 쪽은', a: { label: '나', echo: '먼저 꺼내는 사람은 침묵을 못 견디는 거예요. 자리가 필요해요.', tag: '먼저 말을 꺼내는 사람답게' }, b: { label: '그 사람', echo: '기다리는 사람은 자기 자리를 지키는 거예요. 그게 중요해요.', tag: '기다리는 사람답게' } },
    { q: '그 사람 물건이 내 자리에 있으면', a: { label: '치운다', echo: '선을 긋는 사람이에요. 집에 선이 필요해요.', tag: '선을 긋는 사람답게' }, b: { label: '둔다', echo: '선을 안 긋는 사람이에요. 집이 대신 그어 줘야 해요.', tag: '그 사람 물건을 두는 사람답게' } },
    { q: '싸우고 나면', a: { label: '같은 방에 있는다', echo: '붙어서 푸는 사람이에요. 방이 하나라도 자리는 둘이어야 해요.', tag: '붙어서 푸는 사람답게' }, b: { label: '다른 방으로 간다', echo: '떨어져서 푸는 사람이에요. 닫을 수 있는 문이 하나 필요해요.', tag: '떨어져서 푸는 사람답게' } },
  ],
};

// 받침에 따라 조사를 고른다
const bat = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eul = (w) => w + (bat(w) ? '을' : '를');
const ga = (w) => w + (bat(w) ? '이' : '가');
const neun = (w) => w + (bat(w) ? '은' : '는');
const ina = (w) => w + (bat(w) ? '이나' : '나');

const PAST = {
  sleep: '올해 들어 자리를 옮기거나 옮길까 고민한 적이 있을 거예요.',
  town: '작년 이맘때 이 동네가 유난히 시끄럽게 느껴진 날이 있었을 거예요.',
  country: '떠나고 싶은 마음이 올해 유난히 자주 들었을 거예요.',
  pair: '같은 데서 같이 지쳤던 저녁이 올해 몇 번 있었을 거예요.',
};

// 관계 다섯 가지 → 긴장 · 피할 것 · 990원 답 뼈대
const REL = {
  합: { tension: '서로 붙으려는 사이라 한쪽이 자리를 잃기 쉬워요.', avoid: '각자의 자리가 없는 집만 피하면 돼요.', paid1: '방 하나에 책상 둘 말고, 각자 벽 하나씩이면 돼요.', paid3: '한 사람 물건이 두 벽을 다 차지하는 배치는 피하세요.', lock: '한 벽을', card: '각자의 자리가 없는 집 피하기' },
  충: { tension: '서로 부딪히는 사이라 같은 시간에 같은 자리를 쓰면 날이 서요.', avoid: '같은 시간에 같은 방을 쓰는 것만 피하면 돼요.', paid1: '아침 세면대와 저녁 부엌처럼 겹치는 시간을 30분만 비켜 두면 돼요.', paid3: '둘이 동시에 쓰는 책상 하나는 피하세요.', lock: '같은 시간', card: '같은 시간에 같은 방 쓰지 않기' },
  생: { tension: '그 사람이 당신을 살리는 사이라 그 사람 자리를 건드리면 당신 기운이 줄어요.', avoid: '그 사람 물건을 내 기준으로 치우는 것만 피하면 돼요.', paid1: '그 사람의 어질러짐이 당신 기운이에요. 그 사람 자리는 그대로 두면 돼요.', paid3: '그 사람 자리를 내가 정리하는 날은 피하세요.', lock: '그 사람', card: '그 사람 자리 내 기준으로 치우지 않기' },
  극: { tension: '그 사람 기운이 당신 기운보다 센 사이라 닫을 것이 없으면 당신이 먼저 지쳐요.', avoid: '둘 사이에 문이 없는 집만 피하면 돼요.', paid1: '벽이 아니라 닫을 수 있는 것 하나면 돼요. 문 하나, 커튼 하나로 충분해요.', paid3: '한 공간에 칸막이 없는 배치는 피하세요.', lock: '문 없는', card: '둘 사이에 닫을 것 없는 집 피하기' },
  닮음: { tension: '닮은 사람 둘이 한 방향으로 누우면 같은 쪽으로 기운이 새요.', avoid: '두 사람이 같은 방향에 머리를 두고 자는 것만 피하면 돼요.', paid1: '머리 방향을 서로 다르게 두면 돼요. 한 사람은 동쪽, 한 사람은 남쪽이어도 돼요.', paid3: '창 하나에 책상 둘은 피하세요. 둘이 한 창을 나누면 둘 다 흐려져요.', lock: '창 하나', card: '같은 방향으로 머리 두고 자지 않기' },
};

// 입력: chart = pillars() 결과, hourKnown, q = 질문 id, picks = ['a'|'b' ×3], other = 상대 chart(질문 ④)
export function compose({ chart, hourKnown, q, picks, other, now }) {
  const stem = chart.day[0];
  const mb = chart.month[1];
  const yong = yongsin(stem, mb);
  const P = place(yong);
  const st = STEM_TEXT[stem];
  const term = nextTerm(now);
  const tag = GUIDES[q][0][picks[0]].tag;
  const widen = hourKnown ? '' : ' 시각을 모르면 방향이 한 칸 넓어져요.';

  const s1 = `${SEASON_PHRASE[mb]} 태어난 ${st.metaphor}예요. ${st.twoSided}이죠.`;
  const s2 = PAST[q];
  let s3, s4, lock, lockFull, paid, card;

  if (q === 'sleep') {
    s3 = '지금 그대로 두면 기운이 조금씩 새는 편이에요.';
    s4 = `머리를 ${P.avoidDir}쪽 벽에 두고 자는 것만 피하면 돼요. ${P.avoidDir}쪽은 ${eul(P.elName)} ${P.verb} ${P.avoidElName}의 방향이에요.${widen}`;
    lockFull = P.bedside[0];
    lock = `당신 방에서 가장 피해야 할 것 하나는 침대 옆의 ${lockFull.slice(0, 1)}`;
    paid = [
      `머리는 ${P.dir}쪽이에요.`,
      `${tag} 창을 등지지 말고, ${P.window}이 있으면 그쪽에 머리를 두면 돼요.`,
      `침대 옆에 ${ina(P.bedside[0])} ${neun(P.bedside[1])} 두지 마세요. ${ga(P.avoidElName)} ${eul(P.elName)} ${P.verbDo}.`,
      `${ga(term.label)} 지나면 한 번 더 볼 때예요. 계절이 바뀌면 방향이 한 칸 돌아요.`,
      '바꿀 건 그것 하나예요.',
    ];
    card = `${P.avoidDir}쪽 벽에 머리 두고 자지 않기 · ${term.month}월 ${term.day}일까지`;
  } else if (q === 'town') {
    s3 = '편한 쪽에만 살면 기운을 밖에서 계속 사 와야 해요.';
    s4 = `창이 ${P.avoidDir}쪽으로만 난 방만 피하면 돼요.${widen}`;
    lockFull = P.avoidTerrain;
    lock = `당신에게 가장 안 맞는 동네 조건 하나는 ${lockFull.slice(0, 2)}`;
    paid = [
      `${P.dir}쪽에 ${ga(P.terrain)} 맞아요.`,
      `${tag} 창이 ${P.dir}쪽이면 더 좋아요.`,
      `${neun(P.avoidTerrain)} 피하세요. ${ga(P.avoidElName)} ${eul(P.elName)} ${P.verb} 자리예요.`,
      `이사를 생각하면 ${term.label} 전이 편하고, 지나면 다음 절기까지 한 칸 쉬어도 돼요.`,
      '바꿀 건 그것 하나예요.',
    ];
    card = `${P.avoidDir}쪽 창만 있는 방 피하기`;
  } else if (q === 'country') {
    s3 = '맞지 않는 방위에 오래 있으면 늘 조금씩 흔들려요.';
    s4 = `${P.avoidDir}쪽의 ${P.avoidClimate}에 긴 계획을 세우는 것만 피하면 돼요.${widen}`;
    lockFull = `${P.avoidDir}쪽 이동`;
    lock = `당신과 가장 안 맞는 이동 하나는 ${term.label} 이후의 ${lockFull.slice(0, 1)}`;
    paid = [
      `${P.climate}, 지금 있는 곳에서 ${P.dir}쪽이 맞아요.`,
      `${tag} 걸어서 ${P.elName} 가까이 닿는 도시면 돼요.`,
      `지금 있는 곳이 ${P.avoidDir}쪽이라면 집 안에서라도 ${P.window}을 열어 두면 돼요.`,
      `${term.label} 이후의 ${P.avoidDir}쪽 이동은 미루는 편이 맞아요. 다음 절기 뒤가 맞아요.`,
      '바꿀 건 그것 하나예요.',
    ];
    card = `${P.avoidDir}쪽 ${P.avoidClimate}에 긴 계획 세우지 않기 · 올해`;
  } else {
    const rel = relation(stem, mb, other.day[0]);
    const R = REL[rel];
    const oSt = STEM_TEXT[other.day[0]];
    s3 = R.tension;
    s4 = `${R.avoid}${widen}`;
    lockFull = R.lock;
    lock = `두 사람 집에서 가장 피해야 할 배치 하나는 ${lockFull.slice(0, 2)}`;
    paid = [
      `${st.metaphor === oSt.metaphor ? `둘 다 ${st.metaphor}예요.` : `당신은 ${st.metaphor}, 그 사람은 ${oSt.metaphor}예요.`} ${R.paid1}`,
      `${tag} 그 사람 자리는 그대로 두고 당신 자리만 하나 더 만들면 돼요.`,
      R.paid3,
      `${ga(term.label)} 지나면 계절 배치로 한 번 더 볼 때예요.`,
      '바꿀 건 그것 하나예요.',
    ];
    card = R.card;
  }
  return { stem, yong, free: [s1, s2, s3, s4], lock, lockFull, paid, card, term, pillars: chart, hourKnown };
}

export const ELEMENT_OF = EL_OF_STEM;
