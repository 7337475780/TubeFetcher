import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CookieManager } from "../CookieManager";
import fs from "fs";

describe("CookieManager", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should extract PO Token arguments correctly", () => {
    process.env.YOUTUBE_PO_TOKEN = "my_po_token";
    process.env.YOUTUBE_VISITOR_DATA = "my_visitor";
    
    const args = CookieManager.getPoTokenArgs();
    expect(args).toContain("--extractor-args");
    expect(args).toContain("youtube:po_token=my_po_token");
    expect(args).toContain("youtube:visitor_data=my_visitor");
  });

  it("should return empty arguments if no cookies or PO tokens are configured", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    delete process.env.YOUTUBE_COOKIES;
    delete process.env.COOKIES_PATH;
    delete process.env.YOUTUBE_COOKIES_PATH;
    delete process.env.YOUTUBE_PO_TOKEN;
    delete process.env.PO_TOKEN;
    delete process.env.YOUTUBE_VISITOR_DATA;
    delete process.env.VISITOR_DATA;
    
    expect(CookieManager.getAuthArgs()).toEqual([]);
  });

  it("should validate and load cookies from environment path if valid", () => {
    process.env.COOKIES_PATH = "/path/to/valid_cookies.txt";
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      "# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1712345678\tGPS\t1"
    );

    const args = CookieManager.getCookieArgs();
    expect(args).toContain("--cookies");
    expect(args).toContain("/path/to/valid_cookies.txt");
  });

  it("should skip environment path cookies if invalid format", () => {
    process.env.COOKIES_PATH = "/path/to/invalid_cookies.txt";
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("This is a simple invalid string");

    const args = CookieManager.getCookieArgs();
    expect(args).toEqual([]);
  });

  it("should validate and load cookies from YOUTUBE_COOKIES environment variable, resolving literal escapes", () => {
    process.env.YOUTUBE_COOKIES = "# Netscape HTTP Cookie File\\n.youtube.com\\tTRUE\\t/\\tTRUE\\t1712345678\\tGPS\\t1";
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    vi.spyOn(fs, "existsSync").mockReturnValue(true);

    const args = CookieManager.getCookieArgs();
    expect(args).toContain("--cookies");
    expect(args[1]).toContain("youtube_cookies_temp.txt");
  });
});
