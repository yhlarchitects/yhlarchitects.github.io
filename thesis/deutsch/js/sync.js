// 동기화 자리. 지금은 기기 안 저장만 한다.
// Cloudflare 계정이 생기면 여기서 /api/sync 로 보내고 받는다(기술 설계 v1 §3·§7).
// 호출하는 쪽은 결과를 기다리지 않는다. 실패해도 기기 안 기록은 그대로다.
export async function sync(state) {
  return { ok: false, reason: "local-only" };
}
