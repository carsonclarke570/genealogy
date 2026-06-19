import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add hover elevation + cursor for clickable cards (e.g. a person tile). */
  interactive?: boolean;
}

/**
 * A surface panel for grouping related content — person summaries, media
 * tiles, record sections. Compose with `CardHeader`, `CardTitle`,
 * `CardDescription`, `CardBody`, and `CardFooter`, or drop children in directly.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-surface shadow-sm",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-md focus-within:shadow-md",
        className,
      )}
      {...props}
    />
  );
});

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

/** Header region of a `Card`; holds a `CardTitle` and optional `CardDescription`. */
export function CardHeader({ className, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-line px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

/** Title of a `Card`, set in the archival serif. */
export function CardTitle({ className, ...props }: CardSectionProps) {
  return (
    <h3
      className={cn(
        "font-serif text-lg font-semibold leading-tight text-ink",
        className,
      )}
      {...props}
    />
  );
}

/** Supporting description under a `CardTitle`. */
export function CardDescription({ className, ...props }: CardSectionProps) {
  return (
    <p className={cn("text-sm text-ink-muted", className)} {...props} />
  );
}

/** Main content region of a `Card`. */
export function CardBody({ className, ...props }: CardSectionProps) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/** Footer region of a `Card`, typically for actions. */
export function CardFooter({ className, ...props }: CardSectionProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-line bg-surface-sunken/50 px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}
