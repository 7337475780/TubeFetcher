import child_process from "child_process";
import fs from "fs";

export class RuntimeDetector {
  /**
   * Detects the best available JS runtime and returns the yt-dlp formatted string.
   * Verifies the runtime works by running it with '--version'.
   * Returns null if no verified runtime is found.
   */
  static getFormattedRuntime(): string | null {
    // 1. Try Node.js
    const nodePath = this.findAndVerifyRuntime("node", ["--version"]);
    if (nodePath) {
      return `node:${nodePath}`;
    }

    // 2. Try Deno
    const denoPath = this.findAndVerifyRuntime("deno", ["--version"]);
    if (denoPath) {
      return `deno:${denoPath}`;
    }

    // 3. Try Bun
    const bunPath = this.findAndVerifyRuntime("bun", ["--version"]);
    if (bunPath) {
      return `bun:${bunPath}`;
    }

    return null;
  }

  /**
   * Returns the correct --js-runtimes argument array for yt-dlp.
   * Returns an empty array if no runtime is available.
   */
  static getRuntimeArgs(): string[] {
    const runtime = this.getFormattedRuntime();
    if (runtime) {
      return ["--js-runtimes", runtime];
    }
    return [];
  }

  /**
   * Finds the path of a runtime and verifies it by executing a check command.
   */
  private static findAndVerifyRuntime(name: string, args: string[]): string | null {
    // For Node, check process.execPath first
    if (name === "node" && process.execPath) {
      const cleanPath = process.execPath;
      if (
        (cleanPath.toLowerCase().endsWith("node") || cleanPath.toLowerCase().endsWith("node.exe")) &&
        fs.existsSync(cleanPath)
      ) {
        if (this.verifyExecution(cleanPath, args)) {
          return cleanPath;
        }
      }
    }

    // Check system PATH
    const isWin = process.platform === "win32";
    const whichCmd = isWin ? "where" : "which";

    try {
      const output = child_process.execSync(`${whichCmd} ${name}`, {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      
      const paths = output.split("\n").map((p) => p.trim());
      for (const p of paths) {
        if (p && fs.existsSync(p)) {
          if (this.verifyExecution(p, args)) {
            return p;
          }
        }
      }
    } catch {
      // Ignore errors when which/where command fails
    }

    return null;
  }

  /**
   * Executes the binary at filePath with the specified arguments.
   * Returns true only if it runs successfully (exit code 0).
   */
  private static verifyExecution(filePath: string, args: string[]): boolean {
    try {
      child_process.execSync(`"${filePath}" ${args.join(" ")}`, {
        stdio: "ignore",
        timeout: 2000, // Safe timeout so it doesn't hang
      });
      return true;
    } catch {
      return false;
    }
  }
}
