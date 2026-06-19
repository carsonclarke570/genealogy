import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Image URL (a protected media route in the app). */
  src?: string;
  /** Person's name — used for the alt text and the initials fallback. */
  name: string;
  /** Diameter preset. Defaults to `md`. */
  size?: AvatarSize;
  /** Use a rounded-square instead of a circle. */
  square?: boolean;
}

const sizes: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * A person's portrait. Renders the image when `src` is provided, otherwise
 * falls back to monogram initials derived from `name` — ideal for ancestors
 * with no surviving photograph.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, name, size = "md", square = false, className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden border border-line-strong bg-primary-soft font-serif font-semibold text-primary",
        square ? "rounded-md" : "rounded-full",
        sizes[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
});
