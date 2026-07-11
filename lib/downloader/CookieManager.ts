import fs from "fs";
import path from "path";
import os from "os";
import { Logger } from "./Logger";

export interface CookieValidationResult {
  valid: boolean;
  source: string;
  cookieCount: number;
  errors: string[];
}

export class CookieManager {
  private static tempCookiePath: string | null = null;
  private static isCleanupRegistered = false;
  private static loadedSource = "✗ Not configured";
  private static loadedFormat = "";
  private static loadedBase64 = false;
  private static loadedCount = 0;

  static getCookieArgs(): string[] {
    if (!this.tempCookiePath) {
      this.loadCookies().catch(err => Logger.error("Error loading cookies async", err));
      // Fallback synchronous load if needed, but typically loadCookies is called during initialize
    }
    return this.tempCookiePath ? ["--cookies", this.tempCookiePath] : [];
  }

  static getPoTokenArgs(): string[] {
    const poToken = process.env.YOUTUBE_PO_TOKEN || process.env.PO_TOKEN;
    const visitorData = process.env.YOUTUBE_VISITOR_DATA || process.env.VISITOR_DATA;
    const args: string[] = [];
    if (poToken) args.push("--extractor-args", `youtube:po_token=${poToken}`);
    if (visitorData) args.push("--extractor-args", `youtube:visitor_data=${visitorData}`);
    return args;
  }

  static getAuthArgs(): string[] {
    return [...this.getCookieArgs(), ...this.getPoTokenArgs()];
  }

  static getDiagnostics(): string {
    const hasPo = !!(process.env.YOUTUBE_PO_TOKEN || process.env.PO_TOKEN);
    const poStr = `PO Token: ${hasPo ? "✓ configured" : "✗ Not configured"}`;
    return `Cookies: ${this.loadedSource} | ${poStr}`;
  }

  static getDetailedDiagnostics() {
    return {
      cookieSource: this.loadedSource,
      cookieFormat: this.loadedFormat,
      base64Decoded: this.loadedBase64,
      cookieRowsFound: this.loadedCount,
      tempFilePath: this.tempCookiePath,
      validationPassed: this.loadedCount > 0,
    };
  }

  static async loadCookies(): Promise<void> {
    if (!this.isCleanupRegistered) {
      this.registerCleanup();
    }

    if (this.tempCookiePath && fs.existsSync(this.tempCookiePath)) {
      return;
    }

    // Source 1: YOUTUBE_COOKIES env var
    if (process.env.YOUTUBE_COOKIES) {
      let content = process.env.YOUTUBE_COOKIES;
      
      const isBase64 = /^[a-zA-Z0-9+/={}\s]+$/.test(content) && !content.includes("\t") && !content.includes("\n");
      if (isBase64) {
        content = this.decodeCookies(content);
        this.loadedBase64 = true;
      } else {
        this.loadedBase64 = false;
      }

      content = this.normalizeCookies(content);
      const validation = this.validateCookies(content, "YOUTUBE_COOKIES env var");

      if (validation.valid) {
        await this.writeTempFile(content, validation);
        return;
      } else {
        Logger.warn(`YOUTUBE_COOKIES validation failed: ${validation.errors.join(", ")}`);
      }
    }

    // Source 2: COOKIES_PATH
    const envPath = process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH;
    if (envPath && fs.existsSync(envPath)) {
      const content = this.normalizeCookies(await fs.promises.readFile(envPath, "utf8"));
      const validation = this.validateCookies(content, `COOKIES_PATH (${envPath})`);
      if (validation.valid) {
        await this.writeTempFile(content, validation);
        return;
      }
    }

    // Source 3: default cookies.txt
    const defaultPath = path.join(process.cwd(), "cookies.txt");
    if (fs.existsSync(defaultPath)) {
      const content = this.normalizeCookies(await fs.promises.readFile(defaultPath, "utf8"));
      const validation = this.validateCookies(content, "cookies.txt (workspace root)");
      if (validation.valid) {
        await this.writeTempFile(content, validation);
        return;
      }
    }
  }

  static validateCookies(text: string, source: string): CookieValidationResult {
    const result: CookieValidationResult = {
      valid: false,
      source,
      cookieCount: 0,
      errors: [],
    };

    if (!text.startsWith("# Netscape HTTP Cookie File")) {
      result.errors.push("Missing '# Netscape HTTP Cookie File' header at start");
    }

    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const parts = line.split("\t");
      if (parts.length >= 7) {
        result.cookieCount++;
      } else if (line.includes(" ")) {
        // Warning for space-separated files
        result.errors.push("Found space-separated row instead of tab-separated");
      }
    }

    if (result.cookieCount === 0) {
      result.errors.push("No valid tab-separated cookie rows found");
    }

    result.valid = result.errors.length === 0 && result.cookieCount > 0;
    return result;
  }

  private static decodeCookies(text: string): string {
    try {
      return Buffer.from(text, "base64").toString("utf-8");
    } catch {
      return text;
    }
  }

  private static normalizeCookies(text: string): string {
    // Unescape literal escapes
    let normalized = text
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t");

    // Convert CRLF to LF
    normalized = normalized.replace(/\r\n/g, "\n");
    
    return normalized;
  }

  private static async writeTempFile(content: string, validation: CookieValidationResult): Promise<void> {
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `yt_cookies_${Date.now()}.txt`);

    try {
      await fs.promises.writeFile(tempPath, content, "utf8");

      // Verify the written file byte-for-byte read back
      const readBack = await fs.promises.readFile(tempPath, "utf8");
      const check = this.validateCookies(readBack, validation.source);

      if (!check.valid) {
        await fs.promises.unlink(tempPath).catch(() => {});
        throw new Error(`Temp file verification failed: ${check.errors.join(", ")}`);
      }

      this.tempCookiePath = tempPath;
      this.loadedSource = `✓ loaded from ${validation.source}`;
      this.loadedFormat = "Netscape HTTP Cookie File";
      this.loadedCount = validation.cookieCount;
      Logger.info(`INFO Cookies verified and loaded: ${validation.cookieCount} rows from ${validation.source}`);
    } catch (err) {
      Logger.error("Failed to safely write cookies temp file", err);
    }
  }

  static cleanup() {
    if (this.tempCookiePath && fs.existsSync(this.tempCookiePath)) {
      try {
        fs.unlinkSync(this.tempCookiePath);
        this.tempCookiePath = null;
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private static registerCleanup() {
    this.isCleanupRegistered = true;
    process.on("exit", () => this.cleanup());
    process.on("SIGINT", () => {
      this.cleanup();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      this.cleanup();
      process.exit(0);
    });
  }
}
