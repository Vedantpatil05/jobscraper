import UserAgent from "user-agents";

/**
 * randomDelay: wait random ms between min..max
 */
export function randomDelay(min = 500, max = 1500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * pickUserAgent: returns a realistic user-agent string
 */
export function pickUserAgent(): string {
  const ua = new UserAgent();
  return ua.toString();
}

/**
 * retry helper with async fn
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  let lastError: any;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}
