import "server-only";
import { getDb } from "../db";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfter: number };

/**
 * Limiteur à fenêtre fixe stocké en base (fonctionne en serverless, sans Redis).
 * @param key identifiant (ex. "login:ip:<hash>")
 * @param limit nombre de requêtes autorisées par fenêtre
 * @param windowSeconds durée de la fenêtre
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const db = await getDb();
  const [row] = await db.query<{ count: number; retry: number }>(
    `insert into rate_limits (key, count, reset_at)
     values ($1, 1, now() + make_interval(secs => $2))
     on conflict (key) do update set
       count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
       reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
     returning count, greatest(0, ceil(extract(epoch from (reset_at - now()))))::int as retry`,
    [key, windowSeconds],
  );
  if (Math.random() < 0.02) {
    await db.query(`delete from rate_limits where reset_at < now() - interval '1 day'`);
  }
  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfter: row.retry,
  };
}

export async function resetRateLimit(key: string) {
  const db = await getDb();
  await db.query(`delete from rate_limits where key = $1`, [key]);
}
