import { describe, it, expect } from "vitest";
import { CookieManager } from "../CookieManager";

describe("CookieManager", () => {
  it("should validate strict Netscape HTTP Cookie files", () => {
    const validContent = `# Netscape HTTP Cookie File\n\n.youtube.com\tTRUE\t/\tTRUE\t1783764807\tYTSESSION\tABC`;
    const result = CookieManager.validateCookies(validContent, "test");
    expect(result.valid).toBe(true);
    expect(result.cookieCount).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject missing header", () => {
    const invalidContent = `.youtube.com\tTRUE\t/\tTRUE\t1783764807\tYTSESSION\tABC`;
    const result = CookieManager.validateCookies(invalidContent, "test");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Missing '# Netscape HTTP Cookie File'");
  });

  it("should reject space-separated formats instead of silently modifying them", () => {
    const invalidContent = `# Netscape HTTP Cookie File\n\n.youtube.com TRUE / TRUE 1783764807 YTSESSION ABC`;
    const result = CookieManager.validateCookies(invalidContent, "test");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Found space-separated row instead of tab-separated");
  });
});
