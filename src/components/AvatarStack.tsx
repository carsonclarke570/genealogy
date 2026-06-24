import { Avatar } from "./Avatar";
import type { AvatarSize } from "./Avatar";
import { Tooltip } from "./Tooltip";

export interface AvatarStackItem {
  /** Person/entity name — drives the avatar initials and the tooltip. */
  name: string;
  /** Optional click handler (makes the item a button). */
  onClick?: () => void;
}

export interface AvatarStackProps {
  items: AvatarStackItem[];
  /** How many avatars to show before stopping. @default 3 */
  max?: number;
  /** Avatar size. @default "sm" */
  size?: AvatarSize;
}

/**
 * AvatarStack — a row of overlapping avatars for "the people involved".
 *
 * Each avatar overlaps the previous and wears a surface-coloured ring so the
 * group reads as one cluster, with the name on a Tooltip. Use it wherever a
 * fact touches several people (a timeline event, a shared document); pair it
 * with a names label when you want the full list spelled out. Items become
 * buttons when given an `onClick`.
 */
export function AvatarStack({ items, max = 3, size = "sm" }: AvatarStackProps) {
  return (
    <span className="fa-avstack">
      {items.slice(0, max).map((it, i) => (
        <Tooltip key={i} label={it.name}>
          {it.onClick ? (
            <button type="button" className="fa-avstack__item" onClick={it.onClick} aria-label={it.name}>
              <Avatar name={it.name} size={size} />
            </button>
          ) : (
            <span className="fa-avstack__item">
              <Avatar name={it.name} size={size} />
            </span>
          )}
        </Tooltip>
      ))}
    </span>
  );
}
