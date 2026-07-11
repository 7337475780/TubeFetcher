import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RetryManager } from "../RetryManager";
import { DownloaderError } from "../DownloaderError";

describe("RetryManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(global.Math, "random").mockReturnValue(0); // Remove jitter for tests
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should return immediately if successful", async () => {
    const task = vi.fn().mockResolvedValue("success");
    const result = await RetryManager.retry(task);
    expect(result).toBe("success");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("should not retry on terminal errors", async () => {
    const task = vi.fn().mockRejectedValue(new DownloaderError("AUTH_REQUIRED", "Need auth"));
    await expect(RetryManager.retry(task)).rejects.toThrow("Need auth");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("should retry 3 times with exponential backoff on transient errors", async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new DownloaderError("RATE_LIMITED", "429"))
      .mockRejectedValueOnce(new DownloaderError("RATE_LIMITED", "429"))
      .mockResolvedValueOnce("success");

    const promise = RetryManager.retry(task);
    
    // First retry delay is 2s
    await vi.advanceTimersByTimeAsync(2000);
    // Second retry delay is 5s
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result).toBe("success");
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("should throw standard message if rate limit fails after 3 attempts", async () => {
    const task = vi.fn().mockRejectedValue(new DownloaderError("RATE_LIMITED", "429"));
    const promise = RetryManager.retry(task);

    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(10000);

    await expect(promise).rejects.toThrow("The service is temporarily rate limited. Please try again later.");
    expect(task).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });
});
