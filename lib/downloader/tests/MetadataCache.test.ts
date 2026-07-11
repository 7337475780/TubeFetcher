import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MetadataCache } from "../MetadataCache";

describe("MetadataCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // @ts-expect-error: Private field access for tests
    MetadataCache.cache.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should cache and retrieve data", () => {
    MetadataCache.set("video1", { title: "Test" });
    const result = MetadataCache.get("video1");
    expect(result).toEqual({ title: "Test" });
    expect(MetadataCache.getCacheCount()).toBe(1);
  });

  it("should expire cache after TTL", () => {
    MetadataCache.set("video2", { title: "Test 2" });
    vi.advanceTimersByTime(31 * 60 * 1000); // 31 minutes
    const result = MetadataCache.get("video2");
    expect(result).toBeNull();
    expect(MetadataCache.getCacheCount()).toBe(0); // auto cleaned up on get
  });

  it("should return null for miss", () => {
    expect(MetadataCache.get("missing")).toBeNull();
  });
});
