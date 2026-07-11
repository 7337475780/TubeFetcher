export class UrlNormalizer {
  /**
   * Normalizes YouTube URLs to strip tracking and playlist query parameters.
   * Keeps only the video 'v' parameter for watch paths.
   * Throws an error for unsupported hosts or malformed URLs.
   */
  static normalize(urlStr: string): string {
    let url: URL;
    try {
      url = new URL(urlStr.trim());
    } catch {
      throw new Error("Invalid URL format");
    }

    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    const supportedHosts = [
      "youtube.com",
      "youtu.be",
      "music.youtube.com",
      "m.youtube.com",
    ];

    if (!supportedHosts.includes(hostname)) {
      throw new Error(`Unsupported domain: ${url.hostname}`);
    }

    // 1. Short URLs: youtu.be/VIDEO_ID
    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/")[1];
      if (!videoId) {
        throw new Error("Missing video ID in short URL");
      }
      return `https://youtu.be/${videoId}`;
    }

    // 2. Watch URLs: /watch?v=VIDEO_ID
    if (url.pathname === "/watch") {
      const v = url.searchParams.get("v");
      if (!v) {
        throw new Error("Missing 'v' parameter in watch URL");
      }
      return `https://${url.hostname}${url.pathname}?v=${v}`;
    }

    // 3. Shorts URLs: /shorts/VIDEO_ID
    if (url.pathname.startsWith("/shorts/")) {
      const parts = url.pathname.split("/");
      const videoId = parts[2];
      if (!videoId) {
        throw new Error("Missing video ID in Shorts URL");
      }
      return `https://${url.hostname}/shorts/${videoId}`;
    }

    // 4. Embed URLs: /embed/VIDEO_ID
    if (url.pathname.startsWith("/embed/")) {
      const parts = url.pathname.split("/");
      const videoId = parts[2];
      if (!videoId) {
        throw new Error("Missing video ID in Embed URL");
      }
      return `https://${url.hostname}/embed/${videoId}`;
    }

    // Fallback/Default for supported domains but unhandled path (e.g. root or search)
    throw new Error("Unsupported YouTube URL format");
  }
}
