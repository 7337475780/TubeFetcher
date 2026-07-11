import { describe, it, expect, vi } from "vitest";
import { RetryManager } from "../RetryManager";
import { DownloaderError } from "../DownloaderError";

describe("RetryManager", () => {
  it("should return output directly if operation succeeds on the first try", async () => {
    const op = vi.fn().mockResolvedValue("done");
    const result = await RetryManager.retry(op, 3, 5);
    expect(result).toBe("done");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("should retry on RATE_LIMITED and eventually succeed", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new DownloaderError("RATE_LIMITED", "Too Many Requests"))
      .mockResolvedValueOnce("success");

    const result = await RetryManager.retry(op, 3, 5);
    expect(result).toBe("success");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("should retry on NETWORK_ERROR and eventually succeed", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new DownloaderError("NETWORK_ERROR", "Timeout"))
      .mockResolvedValueOnce("success");

    const result = await RetryManager.retry(op, 3, 5);
    expect(result).toBe("success");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("should fail immediately without retrying on non-retryable errors", async () => {
    const op = vi.fn().mockRejectedValue(new DownloaderError("PRIVATE_VIDEO", "This video is private."));
    
    await expect(RetryManager.retry(op, 3, 5)).rejects.toThrow("This video is private.");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("should fail after exceeding max retries", async () => {
    const op = vi.fn().mockRejectedValue(new DownloaderError("RATE_LIMITED", "Too Many Requests"));
    
    await expect(RetryManager.retry(op, 2, 5)).rejects.toThrow("Too Many Requests");
    expect(op).toHaveBeenCalledTimes(2);
  });
});
