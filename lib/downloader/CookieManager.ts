import fs from "fs";
import path from "path";
import os from "os";

export class CookieManager {
  private static tempCookiePath: string | null = null;

  /**
   * Returns the --cookies arguments if cookies are configured.
   * Otherwise returns an empty array.
   */
  static getCookieArgs(): string[] {
    const cookiePath = this.resolveCookiePath();
    if (cookiePath) {
      return ["--cookies", cookiePath];
    }
    return [];
  }

  /**
   * Returns a diagnostics message for the health check.
   */
  static getDiagnostics(): string {
    const cookiePath = this.resolveCookiePath();
    if (!cookiePath) {
      return "✗ Not configured (some YouTube extractions may fail with bot challenges)";
    }
    
    if (process.env.YOUTUBE_COOKIES) {
      return `✓ Configured via YOUTUBE_COOKIES environment variable (temp file: ${path.basename(cookiePath)})`;
    }
    
    const envPath = process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH;
    if (envPath) {
      return `✓ Configured via environment path: ${cookiePath}`;
    }

    return `✓ Loaded from cookies.txt in workspace root`;
  }

  /**
   * Resolves the path to the cookies file, creating a temporary file if needed.
   */
  private static resolveCookiePath(): string | null {
    // 1. Check if YOUTUBE_COOKIES env variable is present (contains cookie content directly)
    if (process.env.YOUTUBE_COOKIES) {
      try {
        if (this.tempCookiePath && fs.existsSync(this.tempCookiePath)) {
          return this.tempCookiePath;
        }

        let cookieContent = process.env.YOUTUBE_COOKIES.trim();
        // If it looks like base64, decode it
        if (/^[a-zA-Z0-9+/={}\s]+$/.test(cookieContent) && !cookieContent.includes("\t")) {
          try {
            cookieContent = Buffer.from(cookieContent, "base64").toString("utf-8");
          } catch {
            // Ignore error, treat as raw text
          }
        }

        const tempDir = os.tmpdir();
        const tempPath = path.join(tempDir, "youtube_cookies_temp.txt");
        fs.writeFileSync(tempPath, cookieContent, "utf-8");
        this.tempCookiePath = tempPath;
        return tempPath;
      } catch (err) {
        console.error("[CookieManager] Failed to write YOUTUBE_COOKIES to temp file:", err);
      }
    }

    // 2. Check COOKIES_PATH or YOUTUBE_COOKIES_PATH env variables
    const envPath = process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    // 3. Check for cookies.txt in the current working directory
    const defaultPath = path.join(process.cwd(), "cookies.txt");
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }

    return null;
  }
}
