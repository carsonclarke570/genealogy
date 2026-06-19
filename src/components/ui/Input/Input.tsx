import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Control height. Defaults to `md`. */
  inputSize?: InputSize;
  /** Render the error state (red border + ring). */
  invalid?: boolean;
}

const base =
  "w-full rounded-md border bg-surface text-ink placeholder:text-ink-subtle outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60";

const sizes: Record<InputSize, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-4 text-base",
};

/**
 * A single-line text field for person records — names, dates, places.
 *
 * Pair with `Field` to attach a label, hint, and error message. Set `invalid`
 * to surface validation failures returned from the Zod boundary checks.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = "md", invalid = false, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        sizes[inputSize],
        invalid
          ? "border-danger focus-visible:ring-danger/40"
          : "border-line-strong",
        className,
      )}
      {...props}
    />
  );
});
