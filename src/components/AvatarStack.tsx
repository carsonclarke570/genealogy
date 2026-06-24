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
  /** Show a "+N" bubble when there are more items than `max`. @default false */
  showOverflow?: boolean;
  /** Wrap each avatar in a Tooltip showing its name. @default true */
  tooltip?: boolean;
}

/**
 * AvatarStack — a row of overlapping avatars for "the people involved".
 *
 * Each avatar overlaps the previous and wears a surface-coloured ring so the
 * group reads as one cluster. Use it wherever a fact touches several people (a
 * timeline event, a shared document); pair it with a names label when you want
 * the full list spelled out. Items become buttons when given an `onClick`.
 */
export function AvatarStack({
  items,
  max = 3,
  size = "sm",
  showOverflow = false,
  tooltip = true,
}: AvatarStackProps) {
  const shown = items.slice(0, max);
  const overflow = items.length - shown.length;

  return (
    <span className="fa-avstack">
      {shown.map((it, i) => {
        const avatar = it.onClick ? (
          <button
            type="button"
            className="fa-avstack__item"
            onClick={it.onClick}
            aria-label={it.name}
          >
            <Avatar name={it.name} size={size} />
          </button>
        ) : (
          <span className="fa-avstack__item">
            <Avatar name={it.name} size={size} />
          </span>
        );
        return tooltip ? (
          <Tooltip key={i} label={it.name}>
            {avatar}
          </Tooltip>
        ) : (
          <span key={i} style={{ display: "inline-flex" }}>
            {avatar}
          </span>
        );
      })}
      {showOverflow && overflow > 0 && (
        <span className="fa-avstack__item fa-avstack__more" aria-label={`${overflow} more`}>
          +{overflow}
        </span>
      )}
    </span>
  );
}
