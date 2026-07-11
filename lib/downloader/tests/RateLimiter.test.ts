import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RateLimiter } from "../RateLimiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // @ts-expect-error: Private field access for tests
    RateLimiter.limits.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should enforce metadata endpoint limits", () => {
    const ip = "127.0.0.1";
    // 30 allowed
    for (let i = 0; i < 30; i++) {
      expect(RateLimiter.checkLimit(ip, "metadata")).toBe(true);
    }
    // 31st rejected
    expect(RateLimiter.checkLimit(ip, "metadata")).toBe(false);
  });

  it("should enforce download endpoint limits", () => {
    const ip = "192.168.1.1";
    // 10 allowed
    for (let i = 0; i < 10; i++) {
      expect(RateLimiter.checkLimit(ip, "download")).toBe(true);
    }
    // 11th rejected
    expect(RateLimiter.checkLimit(ip, "download")).toBe(false);
  });

  it("should reset limits after 1 minute", () => {
    const ip = "10.0.0.1";
    for (let i = 0; i < 10; i++) {
      RateLimiter.checkLimit(ip, "download");
    }
    expect(RateLimiter.checkLimit(ip, "download")).toBe(false);

    // Fast forward 61 seconds
    vi.advanceTimersByTime(61 * 1000);

    expect(RateLimiter.checkLimit(ip, "download")).toBe(true);
  });
});
