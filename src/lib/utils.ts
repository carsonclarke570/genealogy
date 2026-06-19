import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts (last wins).
 * Use for all conditional/variant class composition in components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
