# Content schema v1 (2026-10-12)

All files UTF-8 JSON. Korean for instructions/glosses, German for content.
Learning texts use German standard spelling (ß). Swiss originals keep "ss" and set `"swiss": true`.

## manifest.json

```json
{ "version": 1, "days": ["day-01", "day-02"], "decks": ["basel-strasse", "eigene-saetze", "a1-alltag", "wortgruppen"], "diagnostic": "diagnostic.json" }
```

## cards/<deck>.json

```json
{
  "deck": "basel-strasse",
  "title_ko": "바젤 거리의 글자",
  "cards": [
    {
      "id": "basel-strasse:die-haltestelle",
      "de": "die Haltestelle",
      "plural": "die Haltestellen",
      "ko": "정류장",
      "example_de": "Die Haltestelle ist am Barfüsserplatz.",
      "example_ko": "정류장은 바르퓌서플라츠에 있다.",
      "source": "선생 작성 | 대필 역류: <vault path> | 원문: <author title>",
      "tags": ["A1", "Nomen"]
    }
  ]
}
```

- `id` = `<deck>:<slug>`, never changes once published (review state is keyed by it).
- Nouns always with article; verbs with infinitive plus one conjugated example.
  A noun with no usual plural writes `"(복수 거의 없음)"` or `"(복수 없음)"` in `plural`.

Optional card fields (leave the key out when there is nothing to say; never an empty string):

| field | type | meaning |
|---|---|---|
| `lemma` | string or list | Headword(s) exactly as in the Goethe word lists (`curriculum.json` `words_files`). Drives the level tag. |
| `en_hint` | string | English cognate, only when it clearly helps memory: `das Haus` → `house`, `das Wasser` → `water`, `das Tram` → `tram`. Never for false friends. The app shows it as 「영어 · …」. |
| `note_ko` | string | Short Korean note: false-friend warning (`bekommen`은 become이 아니다, `also`는 그래서, `das Gift`는 독), Swiss usage, or a chunk that uses grammar from a later month. |
| `ch_de` | string | Swiss standard variant (`das Billett` for `die Fahrkarte`, `der Zivilstand` for `der Familienstand`). The app does not show it; the same fact also goes into `note_ko`. |
| `swiss` | true | The German text is a Swiss original and keeps ss. |

Tags: `[level, (marker...), part of speech]`.

- Level: the lemma's level is the lowest level among its list entries (a lemma can be listed twice); a card with several lemmas takes the highest of them.
- `eigen`: Basel or architecture word outside the word lists. Replaces the level tag and has no `lemma`. At most 2 per day.
- `Wortgruppe`: a word group card (numbers, days, months, times of day, colours, countries, family). Level is set by hand.
- `Grammatik`: a grammar card without a list headword (e.g. `du`).
- `CH`: the card itself is the Swiss form (`das Tram`).
- A card with neither `lemma` nor one of `eigen` / `Wortgruppe` / `Grammatik` is a checker warning. `en_hint` on a known false friend (`bekommen`/become, `also`/also, `das Gift`/gift, `das Handy`/handy, `bald`/bald, `das Bad`/bad, `der Termin`/term, `wer`/where) is an error.

Decks: `basel-strasse` (week 1 street words), `eigene-saetze` (sentences sent in the master's name), `a1-alltag` (A1 everyday words, official list), `wortgruppen` (word groups).

## days/day-NN.json

```json
{
  "id": "day-01",
  "theme_ko": "바젤 거리의 글자",
  "focus_ko": "sein · 동사는 둘째 자리 · Wie heißen Sie?",
  "new_cards": ["basel-strasse:die-haltestelle"],
  "stair": {
    "source": { "author": "", "title": "", "year": 0, "license": "public-domain | cc-by-sa-4.0 | own", "url": "" },
    "layers": [
      {
        "level": "A1",
        "text_de": "…",
        "gloss": [ { "de": "die Gasse", "ko": "골목" } ],
        "tasks": [
          { "type": "cloze", "prompt_de": "Die ___ ist eng.", "answer": "Gasse", "options": ["Gasse", "Brücke", "Kirche"] },
          { "type": "mc", "prompt_ko": "이 글의 장소는?", "options": ["…", "…"], "answer": 0 },
          { "type": "summary", "prompt_ko": "한 줄로 요약 (독일어 또는 한국어)" }
        ]
      }
    ],
    "summit": { "text_de": "원문 꼭대기 단락(퍼블릭 도메인일 때만 전문, 아니면 빈 문자열과 url)", "note_ko": "누가 언제 쓴 글인지 한 줄" }
  },
  "ear": { "text_de": "듣기·따라 말하기 대본 (stair 첫 층과 같거나 짧은 변형)", "lang": "de-DE", "rates": [0.75, 0.9, 1.0] },
  "hand": { "situation_ko": "실제로 보낼 수 있는 상황", "prompt_ko": "한 문장 쓰기 지시", "model_de": "모범 문장", "chunks": ["Ich möchte …", "Wann …?"] }
}
```

- `focus_ko` (optional): the day's grammar or exam focus in one short line. Printed by `tools/print-week.py`; not yet shown in the app.
- `new_cards`: 8 to 11 ids a day, each id introduced on one day only, at most 2 `eigen` cards a day.
- A1 layers use only grammar already taught that month; anything later (separable verbs, dative after prepositions) appears only as a glossed chunk.

## diagnostic.json

```json
{
  "minutes": 12,
  "items": [
    {
      "id": "d01",
      "skill": "lesen | hoeren | wortschatz | grammatik | schreiben | sprechen",
      "level": "A1 | A2 | B1",
      "type": "mc | cloze | free | record",
      "prompt_ko": "",
      "text_de": "",
      "audio_text_de": "",
      "options": [],
      "answer": 0,
      "hypothesis": "학습자 카드 §5의 가설 번호와 한 줄"
    }
  ]
}
```

- Adaptive rule (app side): stop a skill after two misses at a level.
- `free` and `record` items are not auto-scored; stored for the analyst.

## Local state (app, not content)

`reviews[userId][cardId]` = FSRS card state; `log[]` = { user, date, block, seconds, errors[] }. Users: `yeonho`, `junghyun`.

## days/day-NN.json · mix (optional)

Interleaved review of earlier days, shown after the card queue in the app and as section 5 in print.

```json
"mix": { "tasks": [
  { "type": "cloze", "prompt_de": "Ich ___ aus Korea.", "answer": "komme", "options": ["kommt", "komme", "kommen"], "from": "day-02", "point_ko": "kommen 활용" },
  { "type": "mc", "prompt_ko": "…", "options": ["…", "…"], "answer": 1, "from": "day-05", "point_ko": "숫자" }
] }
```

- `from` must be an earlier day; sources spread as yesterday, 3 to 6 days ago, 7 or more days ago. Never today's focus.

# Schema v2 additions (2026-10-14, 정현 피드백 반영)

- `characters.json` is required. Every person named in day or week text must appear there (learners, shared, yeonho, junghyun). Surname people take Herr/Frau and Sie; first-name people are du. `Anna Meier`/`Frau Meier` are errors; the neighbour is `Frau Bürgin`. Bern-born friend/colleague of 연호 is Aaron (day-06, 11, 13, 18).
- Base day = 연호 version. `variants.junghyun` (optional) overrides keys `theme_ko`, `focus_ko`, `stair`, `ear`, `hand`, `illustration`. `stair` is merged per layer (full layer objects; `source`/`summit` inherited). Same `new_cards`, same grammar, same task shape. Shared scenes (장보기, 기차, 쇼핑, 집, 관리회사) carry no variant.
- `illustration` `{ scene_ko, prompt_en }` on every day (warn if missing, error if a field is empty). Scene only: who, where, what, when. No style words.
- `summary` tasks are an error (removed 2026-10-14: 학습 의욕 저하).
- `weeks/week-N.json`: `{ id, days, title_ko, phrases[10..24 of {de, ko, from, note_ko?}], review { tasks[8..16 cloze/mc with from + point_ko], write { situation_ko, prompt_ko, model_de, chunks } }, variants.junghyun { phrases?, review? } }`. `from` is a day id inside `days`. week-5 = days 29 to 30 plus the whole month.
- `manifest.weeks`: `["week-1", ..., "week-5"]`.
