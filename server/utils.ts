export function log(...args: any[]) {
  // Simple server-side logger used by routes — keep minimal to avoid extra deps
  // Format: prefix with [server]
  console.log('[server]', ...args);
}

export function warn(...args: any[]) {
  console.warn('[server]', ...args);
}

export function error(...args: any[]) {
  console.error('[server]', ...args);
}
