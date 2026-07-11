import { Logger } from "./Logger";

export class DownloadQueue {
  private static MAX_CONCURRENT = 3;
  private static activeCount = 0;
  private static queue: (() => void)[] = [];

  static async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      const run = () => {
        this.activeCount++;
        resolve();
      };

      if (this.activeCount < this.MAX_CONCURRENT) {
        run();
      } else {
        Logger.info("INFO Download queued");
        this.queue.push(run);
      }
    });
  }

  static release(): void {
    if (this.activeCount > 0) {
      this.activeCount--;
    }
    this.processNext();
  }

  static async enqueue<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private static processNext() {
    if (this.queue.length > 0 && this.activeCount < this.MAX_CONCURRENT) {
      const nextTask = this.queue.shift();
      if (nextTask) nextTask();
    }
  }

  static getQueueLength(): number {
    return this.queue.length;
  }

  static getActiveCount(): number {
    return this.activeCount;
  }
}
