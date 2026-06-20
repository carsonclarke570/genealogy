import { useState } from "react";
import type { HTMLAttributes } from "react";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Portrait image URL. When absent or it fails to load, a monogram is shown. */
  src?: string;
  /** Full name — used for the image alt text and to derive the monogram. */
  name: string;
  /** Diameter preset. @default "md" */
  size?: AvatarSize;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Avatar — a round portrait with a monogram fallback.
 *
 * When no `src` is given (or the image errors), it renders the person's initials
 * on a quiet sunken surface, so a person without a photo still reads as a person,
 * not a broken image. Used inside PersonNode and record headers.
 *
 * @example
 * <Avatar name="Eleanor Whitfield" src="/media/eleanor.jpg" size="lg" />
 * <Avatar name="Thomas Reardon" /> // monogram fallback
 */
export function Avatar({
  src,
  name,
  size = "md",
  className,
  ...rest
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const classes = ["fa-avatar", `fa-avatar--${size}`, className]
    .filter(Boolean)
    .join(" ");
  const showImage = src && !failed;

  return (
    <span className={classes} role="img" aria-label={name} {...rest}>
      {showImage ? (
        <img
          className="fa-avatar__img"
          src={src}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
