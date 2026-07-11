import { DownloaderError } from "./DownloaderError";
import { Logger } from "./Logger";

export class RetryManager {
  /**
   * Executes an operation and retries it if it fails due to a retry-eligible error code.
   * Uses exponential backoff.
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt++;

        if (!(error instanceof DownloaderError)) {
          // If it's a generic error, throw it immediately
          throw error;
        }

        // Retry only for: RATE_LIMITED, NETWORK_ERROR
        // Never retry for: AUTH_REQUIRED, PRIVATE_VIDEO, VIDEO_UNAVAILABLE, AGE_RESTRICTED, NO_RUNTIME
        const isRetryable =
          error.code === "RATE_LIMITED" || 
          error.code === "NETWORK_ERROR";

        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        const delay = baseDelayMs * Math.pow(2, attempt);
        Logger.warn(
          `Operation failed with code ${error.code}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
