// 읽어 주기(speechSynthesis). 기본 en-GB, 없으면 en-US, 없으면 아무 영어 음성.

export function hasSpeech() { return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window; }

function langOf(v) { return String(v.lang || "").replace("_", "-"); }

export function enVoices() {
  if (!hasSpeech()) return [];
  return window.speechSynthesis.getVoices().filter((v) => /^en(-|$)/i.test(langOf(v)));
}

export function onVoices(cb) {
  if (!hasSpeech()) return;
  window.speechSynthesis.onvoiceschanged = cb;
}

export function pickVoice(voiceURI, lang = "en-GB") {
  const vs = enVoices();
  if (voiceURI) { const v = vs.find((x) => x.voiceURI === voiceURI); if (v) return v; }
  return vs.find((x) => langOf(x).toLowerCase() === lang.toLowerCase())
    || vs.find((x) => langOf(x).toLowerCase() === "en-us")
    || vs[0] || null;
}

export function speak(text, { voiceURI = null, rate = 1, lang = "en-GB" } = {}) {
  if (!hasSpeech() || !text) return false;
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(voiceURI, lang);
  if (v) { u.voice = v; u.lang = langOf(v); } else { u.lang = lang; }
  u.rate = rate;
  s.speak(u);
  return true;
}

export function stopSpeaking() { if (hasSpeech()) window.speechSynthesis.cancel(); }
