import type { ButtonHTMLAttributes } from "react";
import { Avatar } from "./Avatar";

export interface PersonNodeProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Full name — shown in the serif display face. */
  name: string;
  /** Birth year or date string (e.g. "1888"). */
  birth?: string;
  /** Death year or date string. Omit for a living person. */
  death?: string;
  /** Portrait image URL; falls back to a monogram. */
  photoUrl?: string;
  /** Current focus in the tree — draws the sienna ring. */
  focused?: boolean;
  /** On the highlighted ancestor/descendant lineage — sienna tint. */
  inPath?: boolean;
  /** Show the teal indicator that this person has attached documents. */
  hasDocuments?: boolean;
}

function lifespan(birth?: string, death?: string): string | null {
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `b. ${birth}`;
  if (death) return `d. ${death}`;
  return null;
}

/**
 * PersonNode — the atom of the family tree.
 *
 * A compact, clickable card: portrait (or monogram), the person's name in the
 * Spectral serif, and life-dates in tabular figures. At rest it is flat; on hover
 * it lifts, `focused` draws the sienna ring (and sets `aria-current`), `inPath`
 * tints the highlighted lineage, and `hasDocuments` shows the teal dot. It is a
 * real `<button>`, so the whole node is keyboard-focusable and clickable.
 *
 * @example
 * <PersonNode
 *   name="Eleanor Margaret Whitfield"
 *   birth="1888" death="1971"
 *   focused hasDocuments
 *   onClick={() => openRecord(id)}
 * />
 */
export function PersonNode({
  name,
  birth,
  death,
  photoUrl,
  focused = false,
  inPath = false,
  hasDocuments = false,
  className,
  type = "button",
  ...rest
}: PersonNodeProps) {
  const classes = [
    "fa-person",
    focused && "fa-person--focused",
    inPath && !focused && "fa-person--in-path",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dates = lifespan(birth, death);

  return (
    <button
      type={type}
      className={classes}
      aria-current={focused ? "true" : undefined}
      {...rest}
    >
      <Avatar name={name} src={photoUrl} size="md" />
      <span className="fa-person__body">
        <span className="fa-person__name">{name}</span>
        {dates && <span className="fa-person__dates">{dates}</span>}
      </span>
      {hasDocuments && (
        <span
          className="fa-person__docdot"
          aria-label="Has attached documents"
          role="img"
        />
      )}
    </button>
  );
}
