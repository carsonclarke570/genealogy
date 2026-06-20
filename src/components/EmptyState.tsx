import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Optional icon/illustration shown above the title. */
  icon?: ReactNode;
  /** The headline — say what's missing, plainly. */
  title: ReactNode;
  /** A sentence that teaches the next step. */
  description?: ReactNode;
  /** Primary action (e.g. an "Add person" Button). */
  action?: ReactNode;
}

/**
 * EmptyState — what a surface shows before it has content.
 *
 * Teaches the interface rather than saying "nothing here": a calm icon, a plain
 * title, one guiding sentence, and the action that fills the void. Centered,
 * generous spacing. Use for an empty tree, a person with no documents, or
 * no search results.
 *
 * @example
 * <EmptyState
 *   icon={<TreeIcon />}
 *   title="No people yet"
 *   description="Add the first person to begin building your family tree."
 *   action={<Button variant="primary">Add person</Button>}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="fa-empty">
      {icon && (
        <span className="fa-empty__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className="fa-empty__title">{title}</h3>
      {description && <p className="fa-empty__desc">{description}</p>}
      {action && <div className="fa-empty__action">{action}</div>}
    </div>
  );
}
