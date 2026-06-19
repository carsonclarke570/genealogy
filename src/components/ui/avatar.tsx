/* eslint-disable @next/next/no-img-element */
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Image URL. Falls back to `fallback` initials when absent or on error. */
  src?: string;
  alt?: string;
  /** Initials shown when no image is available. */
  fallback?: string;
}

/**
 * Lightweight avatar. Uses a plain <img> (not next/image) so it works with
 * arbitrary local/streamed media URLs without remote-pattern config.
 */
export function Avatar({
  src,
  alt = "",
  fallback,
  className,
  ...props
}: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground select-none",
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <span>{fallback}</span>
      )}
    </span>
  );
}
