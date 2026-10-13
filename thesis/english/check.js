// 메시지 검사: 업무 영어에서 자주 나오는 꼴만 잡는다. 순서가 곧 우선순위.
// 고칠 것은 하나만 보여 주고, 바른 꼴에는 기계로 고칠 수 있는 것을 모두 고쳐 둔다.

const ABBR = { sth: "something", tmr: "tomorrow", tmrw: "tomorrow", prob: "probably", cuz: "because", u: "you", plz: "please", pls: "please", thx: "thanks", btw: "by the way", ive: "I've", im: "I'm", dont: "don't", cant: "can't" };
const PP = { send: "sent", do: "done", go: "gone", make: "made", take: "taken", see: "seen", give: "given", write: "written", get: "got", check: "checked", ask: "asked", tell: "told", share: "shared", say: "said", know: "known", think: "thought" };
const THIRD = { says: "say", does: "do", has: "have", goes: "go" };
const BASES = new Set("check ask receive update finish start change review upload share use save prepare like want look work call open close confirm print attach mention forget remember finish fix sign mark adjust add remove move".split(" "));
const keepCase = (src, to) => (/^[A-Z]/.test(src) ? to.charAt(0).toUpperCase() + to.slice(1) : to);

export const RULES = [
  {
    id: "perm", ko: "허락을 묻지 말고 알린다. 입장을 말하고, 반대가 있으면 말해 달라고 한다.",
    re: /,?\s*\b(?:is|would)\s+(?:that|this|it)\s+(?:be\s+)?ok(?:ay)?(?:\s+(?:for|with)\s+you)?\s*\?/gi,
    to: () => ". Let me know if you see it differently.",
  },
  {
    id: "perm", ko: "허락을 묻지 말고 알린다: 「I propose …」.",
    re: /\b(?:may|can|could)\s+i\s+(also\s+)?(propose|suggest)\b/gi,
    to: (m, also, v) => keepCase(m, "I " + (also || "") + v),
  },
  {
    id: "perm", ko: "허락을 묻지 말고 알린다: 「I'll …」.",
    re: /\bis\s+it\s+ok(?:ay)?\s+(?:for\s+me\s+)?(?:if\s+i\s+|to\s+)/gi,
    to: (m) => keepCase(m, "I'll "),
  },
  { id: "perm", ko: "괜찮기를 바란다고 덧붙이지 않는다. 한 일을 그대로 알린다.", re: /,?\s*\bi\s+hope\s+(?:it's|it\s+is|that's|that\s+is|everything\s+(?:is|will\s+be|would\s+be))\s+ok(?:ay)?\s*[?.!…]*/gi, to: () => "." },
  { id: "perm", ko: "「May I」 대신 할 일을 말한다: 「I'd like to …」 / 「I'll …」.", re: /\bmay\s+i\b/gi, to: null, ex: "I'd like to show you a second option." },
  { id: "ask", ko: "「gently request」는 영어로 어색하다. 무엇을 해 달라는지 바로 묻는다.", re: /\b(?:i\s+)?(?:gently|kindly|humbly)\s+request\b/gi, to: null, ex: "Could you sign my leave request for 3 to 22 April?" },
  { id: "ask", ko: "승인을 미리 고마워하지 않는다. 고마움은 끝에 한 번.", re: /\bthank(?:s|\s+you)\s+(?:for\s+your\s+approval\s+in\s+advance|in\s+advance\s+for\s+your\s+approval)\b/gi, to: () => "Thanks" },
  {
    id: "tag", ko: "판단을 물음표로 넘기지 않는다. 단정하고 이유를 붙인다.",
    re: /,\s*(?:no|right)\s*\?/gi, to: () => ".",
  },
  { id: "lines", ko: "한 메시지에 한 생각. 다섯 줄이 넘으면 요청 하나만 남긴다.", test: (t) => t.split(/\n/).filter((l) => l.trim()).length > 5, ex: "One question on the section: is the slab 250 or 300?" },
  {
    id: "will_be", ko: "will 뒤에 be 를 붙이지 않는다: 「I'll send」.",
    re: /\bwill\s+be\s+(send|share|check|finish|start|update|prepare|review|discuss|come|go|make|do|have|call|join|submit|upload|ask|look)\b/gi,
    to: (m, v) => keepCase(m, "will " + v),
  },
  {
    id: "thats_base", ko: "「That's」 뒤에 동사가 오면 's 를 빼고 3인칭 s: 「That makes sense」.",
    re: /\b(that|it|this)(?:'s|\s+is)\s+(make|mean|work|need|look|sound)\b/gi,
    to: (m, s, v) => s + " " + v.toLowerCase() + "s",
  },
  {
    id: "do_ed", ko: "do · did 뒤에는 원형: 「Did you check …」.",
    re: /\b((?:do|does|did|don't|doesn't|didn't)\s+(?:you\s+|we\s+|they\s+|i\s+|he\s+|she\s+|it\s+)?)(?!need|feed|speed|proceed|succeed|exceed|embed)(\w+)ed\b/gi,
    to: (m, pre, st) => { const w = st.toLowerCase(); const b = BASES.has(w) ? st : BASES.has(w + "e") ? st + "e" : null; return b ? pre + b : m; },
  },
  {
    id: "is_works", ko: "일반동사 질문은 Is 가 아니라 Does: 「Does this work?」.",
    re: /\bis\s+(this|that|it)\s+(\w+\s+)?(work|mean|fit|help)s\b/gi,
    to: (m, s, mid, v) => keepCase(m, "does " + s + " " + (mid || "") + v),
  },
  {
    id: "does_s", ko: "does · did 뒤 동사에 s 를 붙이지 않는다.",
    re: /\b(does|did|doesn't|didn't)\s+(it|this|that|he|she)\s+(mean|work|need|make|look|sound|fit|help)s\b/gi,
    to: (m, d, s, v) => d + " " + s + " " + v,
  },
  { id: "been_worked", ko: "진행은 been working: 「I've been working on …」.", re: /\b(i|we|they|you)(\s+have|'ve)\s+been\s+worked\b|\bbeen\s+worked\b(?!\s+(?:on|out))/gi, to: (m, s, hv) => (s ? s + hv + " been working" : "been working") },
  {
    id: "should_have", ko: "should · could have 뒤에는 과거분사: 「should have sent」.",
    re: /\b(should|could|would|must|might)\s+have\s+(send|do|go|make|take|see|give|write|get|check|ask|tell|share|say|know|think)\b/gi,
    to: (m, a, v) => a + " have " + PP[v.toLowerCase()],
  },
  { id: "gonna", ko: "will not 과 gonna 를 겹치지 않는다: 「won't」.", re: /\b(?:will\s+not|won't)\s+(?:be\s+)?gonna\b/gi, to: (m) => keepCase(m, "won't") },
  {
    id: "they_s", ko: "they · we · I 뒤 동사에 s 를 붙이지 않는다.",
    re: /\b(they|we|i)\s+(says|does|has|goes|wants|needs|thinks|knows|works|likes)\b/gi,
    to: (m, s, v) => s + " " + (THIRD[v.toLowerCase()] || v.slice(0, -1)),
  },
  { id: "am_agree", ko: "agree 는 동사: 「I agree」.", re: /\b(i|we)\s+(?:am|are|'m|'re)\s+agree\b/gi, to: (m, s) => s + " agree" },
  { id: "keep_continue", ko: "keep 과 continue 를 겹치지 않는다: 「I'll keep going」.", re: /\bkeep\s+continu(?:e|ing)\b/gi, to: () => "keep going" },
  { id: "share_me", ko: "share 는 사람을 바로 받지 않는다: 「send me」 / 「share it with me」.", re: /\bshare\s+(me|us)\b/gi, to: (m, p) => keepCase(m, "send " + p) },
  { id: "explain_to", ko: "explain 뒤 사람에는 to: 「explain it to me」.", re: /\bexplain\s+(me|them|us|him|her)\b/gi, to: (m, p) => keepCase(m, "explain to " + p) },
  { id: "requested", ko: "사람에게 부탁한 것은 asked: 「asked me to …」.", re: /\brequested\s+(me|us|them|him|her)\b/gi, to: (m, p) => "asked " + p },
  { id: "discuss_about", ko: "discuss 는 about 없이: 「discuss the plan」.", re: /\bdiscuss\s+about\b/gi, to: () => "discuss" },
  { id: "until_by", ko: "마감은 until 이 아니라 by: 「by Friday」.", re: /\b(send|finish|submit|deliver|upload|share)(\s+(?:it|this|them|the\s+\w+))?\s+until\b/gi, to: (m, v, o) => v + (o || "") + " by" },
  { id: "help_to", ko: "help 뒤에는 to 없이 원형: 「help me solve it」.", re: /\bhelp\s+(me|us|him|her|them)\s+to\s+(?=\w)/gi, to: (m, p) => keepCase(m, "help " + p + " ") },
  { id: "look_at", ko: "take a look 뒤에는 at: 「take a look at the PDF」.", re: /\b(take|have)\s+a\s+look\s+(?!at\b|into\b|around\b|through\b)(the|this|that|these|those|it|my|our|your|his|her|their)\b/gi, to: (m, v, d) => v + " a look at " + d },
  { id: "asked_to", ko: "사람에게 물을 때 to 를 붙이지 않는다: 「I asked HR」.", re: /\basked\s+to\s+(HR|IT|him|her|them|us|you)\b/g, to: (m, p) => "asked " + p },
  { id: "informed_from", ko: "알림을 받으면 informed by, 또는 주어를 바꾼다: 「HR just told me」.", re: /\b(?:i|we)\s+(?:just\s+)?(?:was\s+|were\s+|got\s+)?(?:just\s+)?informed\s+from\b/gi, to: null, ex: "HR just told me about the questionnaire." },
  { id: "meantime", ko: "「in the meantime」 한 단어.", re: /\bin\s+(?:a|the)\s+mean\s+time\b/gi, to: (m) => keepCase(m, "in the meantime") },
  { id: "how_about", ko: "how about we 뒤에는 원형: 「How about we restate it?」.", re: /\bhow\s+about,?\s+we\s+(?:\w+ly\s+)?\w+ing\b/gi, to: null, ex: "How about we restate the cap in Clause 4?" },
  { id: "consider_to", ko: "consider 뒤에는 -ing: 「consider changing」.", re: /\bconsider\s+to\b/gi, to: null, ex: "Let's consider changing it." },
  { id: "there_are", ko: "여럿이면 there are: 「There are a few issues」.", re: /\bthere(?:\s+is|'s)\s+(a\s+few|several|many|two|three|four|\d+)\b/gi, to: (m, q) => keepCase(m, "there are " + q) },
  { id: "an", ko: "모음 소리 앞에는 an.", re: /\ba\s+(?!one\b|once\b|uni|use|usu|uto|ubiq|eu)([aeiou]\w*)/gi, to: (m, w) => keepCase(m, "an " + w) },
  { id: "the_same", ko: "same 앞에는 the: 「the same result」.", re: /\b(a|got)\s+same\b/gi, to: (m, w) => (w.toLowerCase() === "a" ? keepCase(m, "the same") : w + " the same") },
  { id: "a_few", ko: "셀 수 있는 복수에는 a few: 「a few questions」.", re: /\ba\s+little\s+(\w+[^s\W]s)\b/gi, to: (m, w) => keepCase(m, "a few " + w) },
  { id: "shout", ko: "느낌표 · 글자를 겹치지 않는다. 급하면 날짜를 쓴다.", re: /!{2,}|\b([A-Za-z]*?)([A-Za-z])\2{2,}\b/g, to: (m, a, c) => (m[0] === "!" ? "!" : a + c) },
  {
    id: "abbr", ko: "업무 메시지에서는 줄임말을 풀어 쓴다.",
    re: /(?<![\w-])(sth|tmrw?|prob|cuz|u|plz|pls|thx|btw|ive|im|dont|cant)(?![\w-])/g,
    to: (m) => ABBR[m] || m,
  },
  { id: "punct", ko: "말줄임표 · 쉼표 두 개 대신 마침표로 끊는다.", re: /\s*(?:,,+|\.{3,}|…\.*)\s*/g, to: () => ". " },
  { id: "paren", ko: "영어는 괄호 앞을 띄운다: 「this week (or today)」.", re: /([A-Za-z0-9])\((?=[A-Za-z0-9])/g, to: (m, c) => c + " (" },
];

export const RULE_KO = {
  perm: "허락 꼬리표", tag: "판단을 묻는 꼬리", lines: "한 메시지 한 생각", will_be: "will be + 동사", thats_base: "That's + 동사",
  do_ed: "did + -ed", is_works: "Is this works", does_s: "does it means", been_worked: "been worked", should_have: "should have + 원형",
  gonna: "will not gonna", they_s: "they says", am_agree: "I am agree", keep_continue: "keep continue", share_me: "share me",
  explain_to: "explain me", requested: "requested me", discuss_about: "discuss about", until_by: "until / by", consider_to: "consider to",
  there_are: "there is a few", an: "a / an", the_same: "same 앞 the", a_few: "a little + 복수", abbr: "줄임말", punct: "… · ,,",
  ask: "gently request", help_to: "help me to", look_at: "take a look the", asked_to: "asked to HR", informed_from: "informed from",
  meantime: "in a mean time", how_about: "how about we -ing", shout: "!!!! · ASAPPP", paren: "괄호 앞 띄우기",
};

function tidy(s) {
  return s.replace(/\.\s*\./g, ".").replace(/\s+([.,?!])/g, "$1").replace(/\.([!?])/g, "$1").replace(/([.?!])\s*\.\s/g, "$1 ").replace(/ {2,}/g, " ")
    .replace(/(^|[.?!]\s+)([a-z])/g, (m, a, c) => a + c.toUpperCase()).replace(/(^|\s)i(?=[\s'])/g, "$1I")
    .replace(/(^|[.!?]\s+)((?:I'll|I propose|I also propose|I suggest)[^.?!]*)\?/g, "$1$2.").trim();
}

// 돌려주는 것: { hits:[{id, ko, found, ex}], fixed, right }
export function check(text) {
  const src = String(text || "");
  const hits = [];
  let fixed = src;
  for (const r of RULES) {
    if (r.test) { if (r.test(src)) hits.push({ id: r.id, ko: r.ko, found: null, ex: r.ex || null }); continue; }
    r.re.lastIndex = 0;
    const m = r.re.exec(src);
    if (!m) continue;
    if (!hits.some((x) => x.id === r.id)) hits.push({ id: r.id, ko: r.ko, found: m[0].trim(), ex: r.to ? null : r.ex || null });
    if (r.to) fixed = fixed.replace(r.re, (...a) => r.to(...a));
  }
  if (src.trim()) fixed = tidy(fixed);
  const ids = new Set(hits.map((x) => x.id));
  let right = null;
  if (!src.trim()) right = null;
  else if (!ids.has("perm") && /\b(I'll|I will|I propose|I suggest|I recommend|Let's|I'd like to|I've)\b/i.test(src)) right = "입장을 알리는 꼴로 썼다.";
  else if (!ids.has("lines")) right = "다섯 줄 안에 썼다.";
  if (!hits.length) right = (right ? right + " " : "") + "걸린 꼴이 없다.";
  return { hits, fixed, right };
}
