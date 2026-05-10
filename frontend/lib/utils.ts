import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely gets a nested value from an object using a dot-notation path.
 * @param obj The object to query
 * @param path The path to the value (e.g., "a.b.c" or "a.0.b")
 * @param defaultValue The value to return if path is not found
 */
export function get(obj: any, path: string, defaultValue: any = undefined): any {
  if (!obj || !path) return defaultValue;

  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result === undefined ? defaultValue : result;
}
