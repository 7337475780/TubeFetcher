import { describe, it, expect, beforeEach } from "vitest";
import { DownloadQueue } from "../DownloadQueue";

describe("DownloadQueue", () => {
  beforeEach(() => {
    // @ts-expect-error: Private field access for tests
    DownloadQueue.activeCount = 0;
    // @ts-expect-error: Private field access for tests
    DownloadQueue.queue = [];
  });

  it("should execute task immediately if under limit", async () => {
    const result = await DownloadQueue.enqueue(async () => "done");
    expect(result).toBe("done");
  });

  it("should limit concurrent tasks to 3", async () => {
    let active = 0;
    let maxActive = 0;

    const task = async () => {
      active++;
      if (active > maxActive) maxActive = active;
      await new Promise(r => setTimeout(r, 50));
      active--;
      return "ok";
    };

    const promises = Array.from({ length: 10 }).map(() => DownloadQueue.enqueue(task));
    
    expect(DownloadQueue.getQueueLength()).toBe(7); // 3 running, 7 queued
    expect(DownloadQueue.getActiveCount()).toBe(3);

    await Promise.all(promises);

    expect(maxActive).toBe(3);
    expect(DownloadQueue.getQueueLength()).toBe(0);
    expect(DownloadQueue.getActiveCount()).toBe(0);
  });

  it("should manually acquire and release", async () => {
    await DownloadQueue.acquire();
    expect(DownloadQueue.getActiveCount()).toBe(1);
    DownloadQueue.release();
    expect(DownloadQueue.getActiveCount()).toBe(0);
  });
});
