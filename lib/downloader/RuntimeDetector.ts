import { execSync } from "child_process";
import fs from "fs";

/**
 * yt-dlp --js-runtimes expects the format: "runtimeName:path"
 * e.g. "node:C:\Program Files\nodejs\node.exe"
 * See: https://github.com/yt-dlp/yt-dlp/wiki/EJS
 */
export class RuntimeDetector {
  /**
   * Detects the best available JS runtime and returns the yt-dlp formatted string.
   * Returns null if no runtime is found.
   */
  static getFormattedRuntime(): string | null {
    const isWin = process.platform === "win32";
    const whichCmd = isWin ? "where" : "which";

    // 1. Highest priority: the currently executing Node process itself
    //    On Render/Railway/Docker, process.execPath is the exact path to node inside the container.
    if (
      process.execPath &&
      (process.execPath.toLowerCase().endsWith("node") ||
        process.execPath.toLowerCase().endsWith("node.exe"))
    ) {
      if (fs.existsSync(process.execPath)) {
        console.log(`[RuntimeDetector] Using current Node process: ${process.execPath}`);
        return `node:${process.execPath}`;
      }
    }

    // 2. Try to find Node in PATH
    try {
      const output = execSync(`${whichCmd} node`, {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      const firstNode = output.split("\n")[0].trim();
      if (firstNode && fs.existsSync(firstNode)) {
        console.log(`[RuntimeDetector] Found Node in PATH: ${firstNode}`);
        return `node:${firstNode}`;
      }
    } catch (e) {
      // Node not in PATH
    }

    // 3. Try Deno (yt-dlp's default runtime)
    try {
      const output = execSync(`${whichCmd} deno`, {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      const firstDeno = output.split("\n")[0].trim();
      if (firstDeno && fs.existsSync(firstDeno)) {
        console.log(`[RuntimeDetector] Found Deno in PATH: ${firstDeno}`);
        return `deno:${firstDeno}`;
      }
    } catch (e) {
      // Deno not found
    }

    console.warn("[RuntimeDetector] No supported JS runtime found. YouTube may fail with bot challenges.");
    return null;
  }

  /**
   * Returns the correct --js-runtimes argument array for yt-dlp, or empty array if no runtime found.
   */
  static getRuntimeArgs(): string[] {
    const runtime = this.getFormattedRuntime();
    if (runtime) {
      return ["--js-runtimes", runtime];
    }
    return [];
  }
}
