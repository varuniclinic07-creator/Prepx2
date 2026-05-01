import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Single canonical class joiner — combines clsx (conditional support)
 * with tailwind-merge (last-write-wins for conflicting Tailwind classes).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
