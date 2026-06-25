import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

export interface TimelineItemProps {
  /** Leading marker on the rail — typically an `<IconBadge>`. */
  icon?: ReactNode;
  /** Small monospaced/tabular date shown first in the head row. */
  date?: ReactNode;
  /** Short category label (sentence case), tinted with `categoryColor`. */
  category?: ReactNode;
  /** Colour for the category label (a token). @default var(--color-muted) */
  categoryColor?: string;
  /** The event title — the main line. */
  title?: ReactNode;
  /** Secondary row: place, people, a source chip… */
  meta?: ReactNode;
  /** Hide the trailing connector. Set automatically by `Timeline` for the last item. */
  last?: boolean;
  /** Extra content rendered under the meta row. */
  children?: ReactNode;
}

/**
 * TimelineItem — one event on a vertical Timeline: rail marker + connector,
 * then a date · category head, a title, and an optional meta row.
 *
 * Render inside `<Timeline>`, which draws the connecting line and trims it on
 * the final item. Put an `<IconBadge>` in `icon` to tint the marker by type.
 */
export function TimelineItem({
  icon,
  date,
  category,
  categoryColor = "var(--color-muted)",
  title,
  meta,
  last = false,
  children,
}: TimelineItemProps) {
  return (
    <div className={`fa-timeline__item${last ? " fa-timeline__item--last" : ""}`}>
      <div className="fa-timeline__rail">
        {icon}
        {!last && <span className="fa-timeline__line" />}
      </div>
      <div className="fa-timeline__body">
        {(date || category) && (
          <div className="fa-timeline__head">
            {date && <span className="fa-timeline__date">{date}</span>}
            {category && (
              <span className="fa-timeline__category" style={{ color: categoryColor }}>
                {category}
              </span>
            )}
          </div>
        )}
        {title && <div className="fa-timeline__title">{title}</div>}
        {meta && <div className="fa-timeline__meta">{meta}</div>}
        {children}
      </div>
    </div>
  );
}

export interface TimelineProps {
  /** A list of `<TimelineItem>` elements. */
  children: ReactNode;
}

/**
 * Timeline — a vertical, rail-connected list of dated events.
 *
 * Structure only — genealogy fills it with life events, but it suits any
 * chronology. It draws the connector between markers and hides the trailing
 * segment on the last `TimelineItem` automatically (you don't set `last`).
 *
 * @example
 * <Timeline>
 *   <TimelineItem
 *     icon={<IconBadge icon={<HeartIcon />} color="var(--doc-certificate)" />}
 *     date="1947" category="Marriage" categoryColor="var(--doc-certificate)"
 *     title="Married at St. Mary’s, Boston"
 *     meta={<DocChip type="certificate">Marriage certificate</DocChip>}
 *   />
 *   <TimelineItem icon={<IconBadge icon={<HomeIcon />} />} date="1952" title="Bought the house on Elm St." />
 * </Timeline>
 */
export function Timeline({ children }: TimelineProps) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<TimelineItemProps>[];
  const lastIndex = items.length - 1;
  return (
    <div className="fa-timeline">
      {items.map((child, i) =>
        cloneElement(child, { key: child.key ?? i, last: child.props.last ?? i === lastIndex }),
      )}
    </div>
  );
}
