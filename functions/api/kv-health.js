// Cloudflare Functions - KV 헬스체크
export async function onRequestGet({ env }) {
  const kv = env.KEYWORDS_KV;
  const now = Date.now();

  // 바인딩 및 R/W 간이 점검
  let writeOk = false, readOk = false;
  let errorMessage = null;
  
  if (kv) {
    const testKey = `__health:${now}`;
    try {
      // 쓰기 테스트
      await kv.put(testKey, "ok", { expirationTtl: 60 });
      writeOk = true;
      
      // 읽기 테스트
      const got = await kv.get(testKey);
      readOk = got === "ok";
      
      // 테스트 키 정리
      await kv.delete(testKey);
    } catch (error) {
      errorMessage = error.message;
    }
  }

  return new Response(JSON.stringify({
    kvBound: !!kv,
    writeOk,
    readOk,
    errorMessage,
    timestamp: new Date().toISOString(),
    testKey: kv ? `__health:${now}` : null
  }), { 
    headers: { 
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*"
    } 
  });
}
