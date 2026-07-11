import fs from "fs";
import path from "path";
import os from "os";
import { Logger } from "./Logger";

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
   * Returns the PO token arguments if YOUTUBE_PO_TOKEN or PO_TOKEN is set.
   * Otherwise returns an empty array.
   */
  static getPoTokenArgs(): string[] {
    const poToken = process.env.YOUTUBE_PO_TOKEN || process.env.PO_TOKEN;
    const visitorData = process.env.YOUTUBE_VISITOR_DATA || process.env.VISITOR_DATA;
    const args: string[] = [];

    if (poToken) {
      args.push("--extractor-args", `youtube:po_token=${poToken}`);
    }
    if (visitorData) {
      args.push("--extractor-args", `youtube:visitor_data=${visitorData}`);
    }

    return args;
  }

  /**
   * Returns the combined cookies and PO Token arguments for authentication.
   */
  static getAuthArgs(): string[] {
    return [...this.getCookieArgs(), ...this.getPoTokenArgs()];
  }

  /**
   * Returns a diagnostics message for the health check.
   */
  static getDiagnostics(): string {
    const cookiePath = this.resolveCookiePath();
    const hasPoToken = !!(process.env.YOUTUBE_PO_TOKEN || process.env.PO_TOKEN);
    const hasVisitor = !!(process.env.YOUTUBE_VISITOR_DATA || process.env.VISITOR_DATA);

    const parts: string[] = [];
    if (cookiePath) {
      if (process.env.YOUTUBE_COOKIES) {
        parts.push(`Cookies: ✓ loaded from YOUTUBE_COOKIES env var`);
      } else if (process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH) {
        parts.push(`Cookies: ✓ loaded from path: ${cookiePath}`);
      } else {
        parts.push(`Cookies: ✓ loaded from cookies.txt`);
      }
    } else {
      parts.push(`Cookies: ✗ Not configured`);
    }

    if (hasPoToken) {
      parts.push(`PO Token: ✓ configured${hasVisitor ? " (with Visitor Data)" : ""}`);
    } else {
      parts.push(`PO Token: ✗ Not configured`);
    }

    return parts.join(" | ");
  }

  /**
   * Validates if the content conforms to the Netscape HTTP Cookie File format.
   */
  private static isValidNetscapeCookies(content: string): boolean {
    if (content.includes("# Netscape HTTP Cookie File")) {
      return true;
    }
    
    // Check if it has tab-separated values containing typical cookies fields
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const parts = trimmed.split("\t");
      if (parts.length >= 7) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Parses cookie content line-by-line, converts space-separated fields into
   * tab-separated ones if needed, and ensures the Netscape header is present.
   */
  private static parseAndReconstructCookies(content: string): string {
    const lines = content.split(/\r?\n/);
    const reconstructedLines: string[] = [];

    // Ensure it starts with the valid Netscape header
    reconstructedLines.push("# Netscape HTTP Cookie File");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      let parts = trimmed.split("\t");
      if (parts.length < 7) {
        // Fallback to space-separation if tabs are not present
        parts = trimmed.split(/\s+/);
      }

      if (parts.length >= 7) {
        const isFlag1 = parts[1] === "TRUE" || parts[1] === "FALSE";
        const isFlag2 = parts[3] === "TRUE" || parts[3] === "FALSE";
        const isExpiry = /^\d+$/.test(parts[4]);

        if (isFlag1 && isFlag2 && isExpiry) {
          const standardFields = parts.slice(0, 6);
          const valueField = parts.slice(6).join(" ");
          reconstructedLines.push([...standardFields, valueField].join("\t"));
        }
      }
    }

    return reconstructedLines.join("\n");
  }

  /**
   * Resolves the path to the cookies file, creating a temporary file if needed.
   * Returns null if cookies are missing or invalid.
   */
  private static resolveCookiePath(): string | null {
    // 1. Check YOUTUBE_COOKIES env variable
    if (process.env.YOUTUBE_COOKIES) {
      try {
        if (this.tempCookiePath && fs.existsSync(this.tempCookiePath)) {
          return this.tempCookiePath;
        }

        let cookieContent = process.env.YOUTUBE_COOKIES.trim();
        
        // If it looks like base64, decode it
        if (/^[a-zA-Z0-9+/={}\s]+$/.test(cookieContent) && !cookieContent.includes("\t") && !cookieContent.includes("\n")) {
          try {
            const decoded = Buffer.from(cookieContent, "base64").toString("utf-8");
            cookieContent = decoded;
          } catch {
            // Ignore, use raw
          }
        }

        // Unescape literal control characters (e.g. \n, \r, \t) from cloud provider environments
        cookieContent = cookieContent
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t");

        const reconstructedContent = this.parseAndReconstructCookies(cookieContent);

        if (this.isValidNetscapeCookies(reconstructedContent)) {
          const tempDir = os.tmpdir();
          const tempPath = path.join(tempDir, "youtube_cookies_temp.txt");
          fs.writeFileSync(tempPath, reconstructedContent, "utf-8");
          this.tempCookiePath = tempPath;
          Logger.info("Cookies validated, formatted, and loaded from YOUTUBE_COOKIES env var.");
          return tempPath;
        } else {
          Logger.warn("YOUTUBE_COOKIES content is not a valid Netscape cookies format.");
        }
      } catch (err) {
        Logger.error("Failed to parse/write YOUTUBE_COOKIES", err);
      }
    }

    // 2. Check COOKIES_PATH or YOUTUBE_COOKIES_PATH
    const envPath = process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH;
    if (envPath && fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        if (this.isValidNetscapeCookies(content)) {
          Logger.info(`Cookies validated and loaded from path: ${envPath}`);
          return envPath;
        } else {
          Logger.warn(`Cookies file at ${envPath} is not a valid Netscape cookies format.`);
        }
      } catch (err) {
        Logger.error(`Failed to read cookies from path: ${envPath}`, err);
      }
    }

    // 3. Check for cookies.txt in the current working directory
    const defaultPath = path.join(process.cwd(), "cookies.txt");
    if (fs.existsSync(defaultPath)) {
      try {
        const content = fs.readFileSync(defaultPath, "utf-8");
        if (this.isValidNetscapeCookies(content)) {
          Logger.info("Cookies validated and loaded from default cookies.txt in workspace root.");
          return defaultPath;
        } else {
          Logger.warn("Default cookies.txt is not a valid Netscape cookies format.");
        }
      } catch (err) {
        Logger.error("Failed to read default cookies.txt", err);
      }
    }

    return null;
  }
}
