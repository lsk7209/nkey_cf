export async function withTagVersion(req: Request, env: any) {
  const version = (await env.KV_CACHE.get('tag:version')) || '0';
  const u = new URL(req.url);
  u.searchParams.set('_v', version);
  return new Request(u.toString(), req);
}

export async function cachePut(request: Request, resp: Response, seconds: number) {
  const headers = new Headers(resp.headers);
  headers.set('Cache-Control', `public, max-age=${seconds}`);
  const cloned = new Response(await resp.clone().arrayBuffer(), { status: resp.status, headers });
  await caches.default.put(request, cloned);
  return cloned;
}

export async function rateLimit(env: any, key: string, limit = 60, windowSec = 60) {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSec * 1000));
  const k = `rl:${key}:${bucket}`;
  const cnt = parseInt((await env.KV_RL.get(k)) || '0', 10) + 1;
  await env.KV_RL.put(k, String(cnt), { expirationTtl: windowSec + 5 });
  if (cnt > limit) throw new Error('rate_limit_exceeded');
}
