import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RuntimeDetector } from "../RuntimeDetector";
import child_process from "child_process";
import fs from "fs";

describe("RuntimeDetector", () => {
  const originalExecPath = process.execPath;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, "execPath", {
      value: originalExecPath,
      writable: true,
    });
  });

  it("should return Node.js runtime if process.execPath exists and is executable", () => {
    Object.defineProperty(process, "execPath", {
      value: "/usr/local/bin/node",
      writable: true,
    });

    vi.spyOn(fs, "existsSync").mockImplementation((p) => p === "/usr/local/bin/node");
    vi.spyOn(child_process, "execSync").mockReturnValue(Buffer.from("v20.0.0"));

    const runtime = RuntimeDetector.getFormattedRuntime();
    expect(runtime).toBe("node:/usr/local/bin/node");
  });

  it("should return empty array for getRuntimeArgs when no runtime is verified", () => {
    Object.defineProperty(process, "execPath", {
      value: "/usr/local/bin/node",
      writable: true,
    });

    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(child_process, "execSync").mockImplementation(() => {
      throw new Error("Execution failed");
    });

    const args = RuntimeDetector.getRuntimeArgs();
    expect(args).toEqual([]);
  });
});
