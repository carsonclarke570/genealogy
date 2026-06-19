import { type HTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Diameter preset. Defaults to `md`. */
  size?: SpinnerSize;
  /** Accessible label announced to screen readers. Defaults to "Loading". */
  label?: string;
}

const sizes: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
};

/**
 * An indeterminate loading indicator for fetching records, media, or
 * tree data. Renders an accessible status with a visually-hidden label.
 */
export function Spinner({
  size = "md",
  label = "Loading",
  className,
  ...props
}: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex", className)} {...props}>
      <span
        className={cn(
          "animate-spin rounded-full border-line-strong border-t-primary",
          sizes[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
