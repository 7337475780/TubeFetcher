export class RequestManager {
  private static pendingRequests = new Map<string, Promise<unknown>>();

  static async deduplicate<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = task().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}
