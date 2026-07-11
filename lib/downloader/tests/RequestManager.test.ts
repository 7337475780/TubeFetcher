import { describe, it, expect } from "vitest";
import { RequestManager } from "../RequestManager";

describe("RequestManager", () => {
  it("should deduplicate concurrent requests for the same key", async () => {
    let callCount = 0;
    const task = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return "result";
    };

    // Fire 3 simultaneous requests for the same key
    const p1 = RequestManager.deduplicate("video_123", task);
    const p2 = RequestManager.deduplicate("video_123", task);
    const p3 = RequestManager.deduplicate("video_123", task);

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1).toBe("result");
    expect(r2).toBe("result");
    expect(r3).toBe("result");
    
    // The task should only be invoked ONCE!
    expect(callCount).toBe(1);
  });

  it("should not deduplicate sequential requests", async () => {
    let callCount = 0;
    const task = async () => {
      callCount++;
      return "result";
    };

    await RequestManager.deduplicate("video_456", task);
    await RequestManager.deduplicate("video_456", task);

    expect(callCount).toBe(2); // Since they aren't concurrent
  });
});
