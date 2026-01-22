
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parses data that might be a JSON string or a JSON object.
 * Prevents crashes in components that expect arrays but receive strings from Supabase.
 */
export function safeParse<T>(data: any, defaultValue: T): T {
  if (data === null || data === undefined) return defaultValue;
  
  if (typeof data === 'object') {
    return data as T;
  }
  
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return (parsed === null || parsed === undefined) ? defaultValue : (parsed as T);
    } catch (e) {
      console.warn("safeParse failed for:", data);
      return defaultValue;
    }
  }
  
  return defaultValue;
}
