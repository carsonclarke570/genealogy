import { type HTMLAttributes, type ElementType } from "react";
import { cn } from "../../../lib/cn";

export type TextSize = "sm" | "base" | "lg";
export type TextTone = "default" | "muted" | "subtle";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Render as a different element (`p`, `span`, `div`). Defaults to `p`. */
  as?: ElementType;
  /** Type scale. Defaults to `base`. */
  size?: TextSize;
  /** Color emphasis. Defaults to `default`. */
  tone?: TextTone;
}

const sizes: Record<TextSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const tones: Record<TextTone, string> = {
  default: "text-ink",
  muted: "text-ink-muted",
  subtle: "text-ink-subtle",
};

/**
 * Body copy in the sans typeface — biographical text, captions, helper notes.
 * Use `tone` to step down emphasis for secondary information.
 */
export function Text({
  as: Tag = "p",
  size = "base",
  tone = "default",
  className,
  ...props
}: TextProps) {
  return (
    <Tag
      className={cn(
        "font-sans leading-relaxed",
        sizes[size],
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
