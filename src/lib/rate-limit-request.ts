import { getClientIp, hashIp } from '@/lib/privacy/ip';
import { rateLimit } from '@/lib/rate-limit';

export function checkRateLimit(
  request: Request,
  action: string,
  limit = 10,
  windowMs = 60_000
): boolean {
  const ip = getClientIp(request);
  const key = `${action}:${ip ? hashIp(ip) : 'unknown'}`;
  return rateLimit(key, limit, windowMs);
}
