// 最简单的内存限流：按 IP 1 req/s
const lastAt = new Map<string, number>();
export function simpleRateLimit(ip: string, minIntervalMs = 1000) {
  const now = Date.now();
  const prev = lastAt.get(ip) ?? 0;
  if (now - prev < minIntervalMs) {
    return { allowed: false, retryAfterMs: minIntervalMs - (now - prev) };
  }
  lastAt.set(ip, now);
  return { allowed: true, retryAfterMs: 0 };
}
