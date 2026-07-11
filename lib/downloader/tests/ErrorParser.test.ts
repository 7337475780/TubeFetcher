import { describe, it, expect } from "vitest";
import { parseYtDlpError } from "../DownloaderError";

describe("ErrorParser", () => {
  it("should parse sign in challenges to AUTH_REQUIRED", () => {
    const stderr = "ERROR: [youtube] v5aeCxjlCWE: Sign in to confirm you’re not a bot. Use --cookies-from-browser...";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("AUTH_REQUIRED");
  });

  it("should parse age restrictions to AGE_RESTRICTED", () => {
    const stderr = "ERROR: [youtube] xyz: Sign in to confirm your age. This video may be inappropriate...";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("AGE_RESTRICTED");
  });

  it("should parse private videos to PRIVATE_VIDEO", () => {
    const stderr = "ERROR: [youtube] abc: This video is private. Sign in to check if you have access.";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("PRIVATE_VIDEO");
  });

  it("should parse rate limits to RATE_LIMITED", () => {
    const stderr = "WARNING: [youtube] Unable to download webpage: HTTP Error 429: Too Many Requests";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("RATE_LIMITED");
  });

  it("should parse missing videos to VIDEO_UNAVAILABLE", () => {
    const stderr = "ERROR: [youtube] 12345: Video unavailable. This video has been removed by the uploader.";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("VIDEO_UNAVAILABLE");
  });

  it("should parse missing runtime to NO_RUNTIME", () => {
    const stderr = "WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled...";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("NO_RUNTIME");
  });

  it("should parse network issues to NETWORK_ERROR", () => {
    const stderr = "ERROR: [youtube] Unable to download webpage: <urlopen error [Errno -2] Name or service not known>";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("NETWORK_ERROR");
  });

  it("should return UNKNOWN for unrecognized errors", () => {
    const stderr = "Some random compilation error occurred";
    const err = parseYtDlpError(stderr);
    expect(err.code).toBe("UNKNOWN");
    expect(err.message).toBe(stderr);
  });
});
