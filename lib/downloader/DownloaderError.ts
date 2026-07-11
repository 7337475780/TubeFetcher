export type DownloaderErrorCode =
  | "AUTH_REQUIRED"
  | "RATE_LIMITED"
  | "PRIVATE_VIDEO"
  | "VIDEO_UNAVAILABLE"
  | "AGE_RESTRICTED"
  | "NO_RUNTIME"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class DownloaderError extends Error {
  constructor(
    public code: DownloaderErrorCode,
    message: string,
    public rawError?: unknown
  ) {
    super(message);
    this.name = "DownloaderError";
    Object.setPrototypeOf(this, DownloaderError.prototype);
  }
}

export function parseYtDlpError(stderr: string): DownloaderError {
  const lower = stderr.toLowerCase();

  if (
    lower.includes("sign in to confirm you’re not a bot") ||
    lower.includes("sign in to confirm you're not a bot") ||
    lower.includes("confirm you are not a bot")
  ) {
    return new DownloaderError(
      "AUTH_REQUIRED",
      "Sign in to confirm you're not a bot. Please configure cookies or a PO Token."
    );
  }

  if (
    lower.includes("confirm your age") ||
    lower.includes("age-restricted") ||
    lower.includes("age restricted")
  ) {
    return new DownloaderError(
      "AGE_RESTRICTED",
      "This video is age-restricted and requires account verification (cookies)."
    );
  }

  if (
    lower.includes("private video") ||
    lower.includes("this video is private")
  ) {
    return new DownloaderError(
      "PRIVATE_VIDEO",
      "This video is private and cannot be accessed."
    );
  }

  if (
    lower.includes("members-only") ||
    lower.includes("members only") ||
    lower.includes("only available to subscribers")
  ) {
    return new DownloaderError(
      "AUTH_REQUIRED",
      "This video is members-only and requires cookies."
    );
  }

  if (
    lower.includes("too many requests") ||
    lower.includes("429") ||
    lower.includes("rate limit")
  ) {
    return new DownloaderError(
      "RATE_LIMITED",
      "Rate limit exceeded (HTTP Error 429). Please try again later or configure a PO Token/cookies."
    );
  }

  if (
    lower.includes("video unavailable") ||
    lower.includes("this video has been removed") ||
    lower.includes("does not exist") ||
    lower.includes("not found") ||
    lower.includes("unavailable")
  ) {
    return new DownloaderError(
      "VIDEO_UNAVAILABLE",
      "The video is unavailable, deleted, or does not exist."
    );
  }

  if (lower.includes("no supported javascript runtime could be found")) {
    return new DownloaderError(
      "NO_RUNTIME",
      "No supported JavaScript runtime (Node/Deno/Bun) verified and available to yt-dlp."
    );
  }

  if (
    lower.includes("unable to download webpage") ||
    lower.includes("connection refused") ||
    lower.includes("connection reset") ||
    lower.includes("timed out") ||
    lower.includes("name or service not known") ||
    lower.includes("network unreachable")
  ) {
    return new DownloaderError(
      "NETWORK_ERROR",
      "A network error occurred while communicating with YouTube."
    );
  }

  return new DownloaderError(
    "UNKNOWN",
    stderr.trim() || "An unknown error occurred during video processing."
  );
}
