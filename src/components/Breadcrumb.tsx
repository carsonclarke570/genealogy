import type { ReactNode } from "react";

export interface Crumb {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: Crumb[];
  /** Accessible label for the nav landmark. @default "Breadcrumb" */
  ariaLabel?: string;
}

/**
 * Breadcrumb — hierarchical / lineage navigation.
 *
 * Genealogy is deeply hierarchical, so an ancestor chain is a primary movement
 * (e.g. Tree › Whitfield line › Eleanor › Aoife). The last crumb is the current
 * location (`aria-current="page"`, not a link); the rest are links.
 *
 * @example
 * <Breadcrumb items={[
 *   { label: "Family tree", href: "/tree" },
 *   { label: "Eleanor Whitfield", href: "/p/eleanor" },
 *   { label: "Aoife Reardon" },
 * ]} />
 */
export function Breadcrumb({ items, ariaLabel = "Breadcrumb" }: BreadcrumbProps) {
  return (
    <nav aria-label={ariaLabel} className="fa-breadcrumb">
      <ol className="fa-breadcrumb__list">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="fa-breadcrumb__item">
              {last ? (
                <span className="fa-breadcrumb__current" aria-current="page">
                  {c.label}
                </span>
              ) : (
                <>
                  <a className="fa-breadcrumb__link" href={c.href} onClick={c.onClick}>
                    {c.label}
                  </a>
                  <span className="fa-breadcrumb__sep" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
