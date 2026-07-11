export class Logger {
  static info(message: string, context?: unknown) {
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : "";
    console.log(`[INFO] [${new Date().toISOString()}] ${message}${ctxString}`);
  }

  static warn(message: string, context?: unknown) {
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : "";
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}${ctxString}`);
  }

  static error(message: string, error?: unknown) {
    const errString = error instanceof Error 
      ? ` | Error: ${error.message} - Stack: ${error.stack}` 
      : error 
        ? ` | Error: ${JSON.stringify(error)}` 
        : "";
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}${errString}`);
  }
}
