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
  /**
   * Whether the person is living. When omitted, it's inferred as living if no
   * `death` date is given. Living people show a "Living" tag (and no † glyph),
   * which also flags privacy-sensitive records.
   */
  living?: boolean;
}

/**
 * PersonNode — the atom of the family tree.
 *
 * A compact, clickable card: portrait (or monogram), the person's name in the
 * Spectral serif, and life-dates with genealogy glyphs (✳ born, † died) in
 * tabular figures. Living people instead show a quiet "Living" tag. At rest it is
 * flat; on hover it lifts, `focused` draws the sienna ring (and sets
 * `aria-current`), `inPath` tints the highlighted lineage, and `hasDocuments`
 * shows the teal dot. A real `<button>` — keyboard-focusable and clickable.
 *
 * @example
 * <PersonNode name="Eleanor Whitfield" birth="1888" death="1971" focused hasDocuments />
 * <PersonNode name="Aoife Reardon" birth="1992" onClick={() => openRecord(id)} />
 */
export function PersonNode({
  name,
  birth,
  death,
  photoUrl,
  focused = false,
  inPath = false,
  hasDocuments = false,
  living,
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

  const isLiving = living ?? !death;
  const hasDates = Boolean(birth || death || isLiving);

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
        {hasDates && (
          <span className="fa-person__dates">
            {birth && (
              <span className="fa-person__life" aria-label={`born ${birth}`}>
                <span className="fa-person__glyph" aria-hidden="true">✳</span>
                {birth}
              </span>
            )}
            {death && (
              <span className="fa-person__life" aria-label={`died ${death}`}>
                <span className="fa-person__glyph" aria-hidden="true">†</span>
                {death}
              </span>
            )}
            {isLiving && <span className="fa-person__living">Living</span>}
          </span>
        )}
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
