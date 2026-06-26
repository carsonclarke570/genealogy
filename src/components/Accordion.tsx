import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

export interface AccordionProps {
  /** Header label. */
  title: ReactNode;
  /** Optional leading icon node (sits before the title). */
  icon?: ReactNode;
  /** A count shown as a pill on the right (e.g. number of changes). Hidden when 0. */
  count?: number;
  /** Flag that the section contains something needing attention — shows a warning mark. */
  danger?: boolean;
  /** Accessible label for the danger mark. @default "Needs review" */
  dangerLabel?: string;
  /** Section content, revealed when open. */
  children: ReactNode;
  /** Controlled open state. Pair with `onToggle`. */
  open?: boolean;
  /** Called when the header is activated (controlled usage). */
  onToggle?: (open: boolean) => void;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Accordion — a collapsible disclosure section.
 *
 * A header button toggles a body region: a leading icon, the title, an optional
 * count pill, and a warning mark when the section needs attention. The chevron
 * rotates on open. Works controlled (`open` + `onToggle`) or uncontrolled
 * (`defaultOpen`). The header is `aria-expanded` and owns the body via
 * `aria-controls`, so assistive tech announces the relationship.
 *
 * Stack several with a `display: grid; gap` wrapper for a settings-style list.
 *
 * @example
 * <Accordion title="Relationships" icon={<Icon name="link" />} count={2} danger>
 *   …editable rows…
 * </Accordion>
 */
export function Accordion({
  title,
  icon,
  count = 0,
  danger = false,
  dangerLabel = "Needs review",
  children,
  open,
  onToggle,
  defaultOpen = false,
  className,
}: AccordionProps) {
  const bodyId = useId();
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;

  const toggle = () => {
    if (open === undefined) setInternal((v) => !v);
    onToggle?.(!isOpen);
  };

  const classes = ["fa-accordion", isOpen && "fa-accordion--open", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <button
        type="button"
        className="fa-accordion__head"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={toggle}
      >
        {icon && (
          <span className="fa-accordion__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="fa-accordion__title">{title}</span>
        {danger && (
          <span className="fa-accordion__danger" title={dangerLabel} role="img" aria-label={dangerLabel}>
            <Icon name="alert" size={14} />
          </span>
        )}
        {count > 0 && <span className="fa-accordion__count">{count}</span>}
        <span className="fa-accordion__chev" aria-hidden="true">
          <Icon name="chevron" size={16} />
        </span>
      </button>
      {isOpen && (
        <div id={bodyId} className="fa-accordion__body">
          {children}
        </div>
      )}
    </div>
  );
}
