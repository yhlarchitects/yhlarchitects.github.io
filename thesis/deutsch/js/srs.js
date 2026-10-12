// FSRS 복습 일정. ts-fsrs(MIT) ESM 번들을 그대로 import 한다.
import { fsrs, generatorParameters, createEmptyCard, Rating } from "../vendor/ts-fsrs.js";

const f = fsrs(generatorParameters({ enable_fuzz: true }));
const NEW_PER_SESSION = 10;

export const RATINGS = [
  { r: Rating.Again, ko: "다시" },
  { r: Rating.Hard, ko: "어려움" },
  { r: Rating.Good, ko: "좋음" },
  { r: Rating.Easy, ko: "쉬움" },
];

function revive(c, now) {
  if (!c) return createEmptyCard(now);
  return Object.assign({}, c, {
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  });
}

function plain(card) { return JSON.parse(JSON.stringify(card)); }

export function preview(stored, now = new Date()) {
  const rec = f.repeat(revive(stored, now), now);
  const out = {};
  for (const { r } of RATINGS) out[r] = rec[r].card.due;
  return out;
}

export function rate(stored, rating, now = new Date()) {
  const { card, log } = f.next(revive(stored, now), now, rating);
  return { card: plain(card), log: plain(log) };
}

export function intervalKo(due, now = new Date()) {
  const min = (new Date(due) - now) / 60000;
  if (min < 60) return Math.max(1, Math.round(min)) + "분";
  const h = min / 60;
  if (h < 24) return Math.round(h) + "시간";
  const d = h / 24;
  if (d < 30) return Math.round(d) + "일";
  if (d < 365) return Math.round(d / 30) + "달";
  return (Math.round(d / 36.5) / 10) + "년";
}

// 오늘 볼 카드: 때가 된 카드(오래된 순) + 아직 안 본 새 카드(오늘까지 들어온 것, 최대 10)
export function buildQueue(reviews, cards, introduced, now = new Date()) {
  const due = Object.keys(reviews)
    .filter((id) => cards[id] && new Date(reviews[id].due) <= now)
    .sort((a, b) => new Date(reviews[a].due) - new Date(reviews[b].due));
  const fresh = introduced.filter((id) => cards[id] && !reviews[id]).slice(0, NEW_PER_SESSION);
  return due.concat(fresh);
}

export function dueCount(reviews, cards, introduced, now = new Date()) {
  return buildQueue(reviews, cards, introduced, now).length;
}
