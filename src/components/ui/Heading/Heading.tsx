import { type HTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading rank — controls both the tag and the size. Defaults to `2`. */
  level?: HeadingLevel;
}

const sizes: Record<HeadingLevel, string> = {
  1: "text-3xl font-bold tracking-tight",
  2: "text-2xl font-semibold tracking-tight",
  3: "text-xl font-semibold",
  4: "text-lg font-semibold",
};

/**
 * Section and page titles set in the archival serif. The `level` prop picks
 * both the semantic tag (`h1`–`h4`) and the type scale.
 */
export function Heading({
  level = 2,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn("font-serif text-ink", sizes[level], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
