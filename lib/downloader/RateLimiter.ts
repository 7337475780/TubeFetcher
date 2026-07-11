export class RateLimiter {
  private static limits = new Map<string, { count: number; expiresAt: number }>();

  static checkLimit(ip: string, endpoint: "metadata" | "download"): boolean {
    const key = `${endpoint}:${ip}`;
    const now = Date.now();
    const maxRequests = endpoint === "metadata" ? 30 : 10;
    const windowMs = 60 * 1000;

    let record = this.limits.get(key);
    if (!record || now > record.expiresAt) {
      record = { count: 0, expiresAt: now + windowMs };
    }

    if (record.count >= maxRequests) {
      return false; // Rate limited
    }

    record.count++;
    this.limits.set(key, record);
    return true;
  }
}
