import { describe, it, expect } from "vitest";
import { UrlNormalizer } from "../UrlNormalizer";

describe("UrlNormalizer", () => {
  it("should normalize standard watch URL and strip tracking/playlist parameters", () => {
    const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1&index=2";
    expect(UrlNormalizer.normalize(input)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("should normalize YouTube Shorts URL", () => {
    const input = "https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abcdef&feature=share";
    expect(UrlNormalizer.normalize(input)).toBe("https://www.youtube.com/shorts/dQw4w9WgXcQ");
  });

  it("should normalize youtu.be short links", () => {
    const input = "https://youtu.be/dQw4w9WgXcQ?feature=share&si=123456";
    expect(UrlNormalizer.normalize(input)).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("should normalize YouTube Music links", () => {
    const input = "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&pp=ygUIcmljayBhc3Q%3D";
    expect(UrlNormalizer.normalize(input)).toBe("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("should reject unsupported domains", () => {
    expect(() => UrlNormalizer.normalize("https://google.com")).toThrow();
    expect(() => UrlNormalizer.normalize("https://vimeo.com/123")).toThrow();
  });

  it("should reject malformed URLs", () => {
    expect(() => UrlNormalizer.normalize("not-a-url")).toThrow();
  });
});
