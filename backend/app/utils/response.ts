/**
 * Shared response helpers so every route has a consistent shape.
 */

export function ok<T>(data: T) {
  return { success: true as const, data };
}

export function err(message: string, code = 500) {
  return { success: false as const, error: message, code };
}
