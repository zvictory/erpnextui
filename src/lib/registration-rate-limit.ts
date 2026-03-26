// In-memory rate limiter for public registration endpoint
// 3 registrations per IP per hour

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REGISTRATIONS = 3;

const attempts = new Map<string, number[]>();

export function checkRegistrationRateLimit(ip: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const timestamps = attempts.get(ip) ?? [];

  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);
  attempts.set(ip, valid);

  if (valid.length >= MAX_REGISTRATIONS) {
    const oldest = valid[0];
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  return { allowed: true };
}

export function recordRegistration(ip: string): void {
  const timestamps = attempts.get(ip) ?? [];
  timestamps.push(Date.now());
  attempts.set(ip, timestamps);
}
