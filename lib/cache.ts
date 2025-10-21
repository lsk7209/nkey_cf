// Cloudflare KV 기반 캐시 유틸리티

export async function withTagVersion(req: Request, env: any) {
  const version = (await env.KV_CACHE.get('tag:version')) || '0';
  const u = new URL(req.url);
  u.searchParams.set('_v', version);
  return new Request(u.toString(), req);
}

export async function cachePut(env: any, key: string, value: string, ttl: number) {
  await env.KV_CACHE.put(key, value, { expirationTtl: ttl });
}

export async function cacheGet(env: any, key: string) {
  return await env.KV_CACHE.get(key);
}

export async function rateLimit(env: any, key: string, limit = 60, windowSec = 60) {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSec * 1000));
  const k = `rl:${key}:${bucket}`;
  const cnt = parseInt((await env.KV_CACHE.get(k)) || '0', 10) + 1;
  await env.KV_CACHE.put(k, String(cnt), { expirationTtl: windowSec + 5 });
  if (cnt > limit) throw new Error('rate_limit_exceeded');
}
