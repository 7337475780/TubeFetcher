import { Logger } from "./Logger";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

export class MetadataCache {
  private static cache = new Map<string, CacheEntry>();
  private static TTL_MS = 30 * 60 * 1000; // 30 minutes

  static get(videoId: string): unknown | null {
    const entry = this.cache.get(videoId);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        Logger.info(`INFO Metadata cache hit for ${videoId}`);
        return entry.data;
      }
      this.cache.delete(videoId);
    }
    Logger.info(`INFO Metadata cache miss for ${videoId}`);
    return null;
  }

  static set(videoId: string, data: unknown): void {
    this.cache.set(videoId, {
      data,
      expiresAt: Date.now() + this.TTL_MS,
    });
  }

  static getCacheCount(): number {
    return this.cache.size;
  }
}
