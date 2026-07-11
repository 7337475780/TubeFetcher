import { DownloaderError } from "./DownloaderError";
import { Logger } from "./Logger";

export class RetryManager {
  private static DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  static async retry<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error) {
        if (!(error instanceof DownloaderError)) {
          throw error;
        }

        const isRetryable = error.code === "RATE_LIMITED" || error.code === "NETWORK_ERROR";
        
        if (!isRetryable || attempt >= 3) {
          if (error.code === "RATE_LIMITED") {
            throw new DownloaderError("RATE_LIMITED", "The service is temporarily rate limited. Please try again later.");
          }
          throw error;
        }

        const baseDelay = this.DELAYS[attempt] || 10000;
        const jitter = Math.floor(Math.random() * 500); // 0-500ms jitter
        const delay = baseDelay + jitter;
        
        attempt++;
        Logger.warn(`WARN Retry scheduled in ${delay}ms... (Attempt ${attempt}/3)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
