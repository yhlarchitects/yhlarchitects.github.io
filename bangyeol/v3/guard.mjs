// 금지 목록 검사기. 설계 v2 7절. 결과 문장이 하나라도 걸리면 출력하지 않는다.
const RULES = [
  // 「피하세요」「마세요」(안 하면 되는 것)만 허용하고 그 밖의 「~세요」는 전부 지시로 본다.
  { name: '행동 지시', re: /세요|해라\b|하라\b|해야 해요|해야 돼요/, strip: /피하세요|마세요/g },
  { name: '돈·건강·수명·이별', re: /(?<!정)돈|재산|건강|수명|임신|이별|헤어|죽|사망|병원|질병/ },
  { name: '퍼센트·점수', re: /\d+\s*%|점수|등급|\d+점/ },
  { name: '상대를 깎는 말', re: /나쁜 사람|틀린 사람|안 맞는 사람|해로운|못된|안 맞아요/ },
  { name: '국가명·도시명', re: /한국|일본|중국|미국|독일|스위스|프랑스|영국|이탈리아|스페인|캐나다|호주|서울|부산|도쿄|뉴욕|런던|파리|베를린|바젤|취리히/ },
  { name: '단정 어미', re: /니다[.!]|이다[.!]/ },
];

export function check(text) {
  const hits = [];
  for (const r of RULES) {
    const m = (r.strip ? text.replace(r.strip, '') : text).match(r.re);
    if (m) hits.push({ rule: r.name, at: m[0] });
  }
  return hits;
}

export function checkAll(parts) {
  const out = [];
  for (const p of parts) for (const h of check(p)) out.push({ ...h, text: p });
  return out;
}
