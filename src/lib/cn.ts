import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind-aware conflict resolution.
 *
 * `clsx` flattens conditional class inputs; `twMerge` then dedupes conflicting
 * Tailwind utilities so a caller's override (e.g. a custom `className`) always
 * wins over a component's defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
