// 따라 말하기 녹음(MediaRecorder). 녹음은 이 기기의 IndexedDB 에만 둔다. 어디로도 보내지 않는다.

const DB = "deutsch";
const STORE = "rec";
const MAX_MS = 30000;

export function canRecord() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function putRec(key, blob) {
  const db = await openDB();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ blob, type: blob.type, at: new Date().toISOString() }, key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
  db.close();
}

export async function getRec(key) {
  const db = await openDB();
  const v = await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const q = tx.objectStore(STORE).get(key);
    q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error);
  });
  db.close();
  return v;
}

// 녹음 시작. 돌려주는 stop() 이 Blob 을 준다. 30초가 지나면 저절로 멈춘다.
export async function startRec() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  const mime = MediaRecorder.isTypeSupported ? types.find((t) => MediaRecorder.isTypeSupported(t)) : null;
  const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks = [];
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  let resolveStop;
  const done = new Promise((res) => { resolveStop = res; });
  mr.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    resolveStop(new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" }));
  };
  mr.start();
  const timer = setTimeout(() => { if (mr.state !== "inactive") mr.stop(); }, MAX_MS);
  return {
    stop() { clearTimeout(timer); if (mr.state !== "inactive") mr.stop(); return done; },
    done,
  };
}
