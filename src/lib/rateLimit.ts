const attempts = new Map<string, { count: number; firstAttempt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS: Record<string, number> = {
  login: 5,
  register: 3,
  "forgot-password": 3,
  default: 10,
};

export function checkRateLimit(action: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const key = action;
  const limit = MAX_ATTEMPTS[action] || MAX_ATTEMPTS.default;

  const entry = attempts.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    const retryAfterMs = WINDOW_MS - (now - entry.firstAttempt);
    return { allowed: false, retryAfterMs };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}
