import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional heading shown in the card header (sans title style). */
  title?: ReactNode;
  /** Optional actions aligned to the end of the header row (e.g. a Button). */
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * Card — a flat container for a related group of content.
 *
 * One tonal step above the page (surface + a single hairline border), never a
 * shadow at rest. Do not nest cards — one tonal step is the maximum (The
 * Flat-By-Default Rule). The optional `title`/`actions` render a header row.
 *
 * @example
 * <Card title="Documents" actions={<Button size="sm" variant="ghost">Add</Button>}>
 *   <p className="prose">Three records attached.</p>
 * </Card>
 */
export function Card({
  title,
  actions,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = ["fa-card", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {(title || actions) && (
        <div className="fa-card__header">
          {title && <h3 className="fa-card__title">{title}</h3>}
          {actions && <div className="fa-card__actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
