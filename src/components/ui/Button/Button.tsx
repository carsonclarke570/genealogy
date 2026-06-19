import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../../lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. `primary` is the heritage-green call to action. */
  variant?: ButtonVariant;
  /** Control height and padding. Defaults to `md`. */
  size?: ButtonSize;
  /** Stretch to fill the available width. */
  fullWidth?: boolean;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Element rendered before the label (e.g. an icon). */
  leftIcon?: ReactNode;
  /** Element rendered after the label. */
  rightIcon?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-ink-on-primary hover:bg-primary-hover shadow-sm",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-sunken",
  ghost: "bg-transparent text-ink hover:bg-surface-sunken",
  danger: "bg-danger text-ink-on-primary hover:opacity-90 shadow-sm",
  link: "bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * The primary action control of the archive.
 *
 * Use `primary` for the main action on a screen (save a person, upload media),
 * `secondary` for supporting actions, `ghost` for low-emphasis toolbar actions,
 * `danger` for destructive confirmations, and `link` for inline navigation.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          base,
          variants[variant],
          variant !== "link" && sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);
