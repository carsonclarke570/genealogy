import { type HTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Color treatment. Defaults to `neutral`. */
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/**
 * A small status or category label. Use it for document types
 * (photo, certificate, obituary), relationship roles, or record status.
 */
export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-sans text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
