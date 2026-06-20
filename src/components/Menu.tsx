import { useState } from "react";
import type { ReactNode } from "react";

export interface MenuItem {
  label: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  /** Destructive styling (danger colour + tint on hover). */
  danger?: boolean;
  disabled?: boolean;
}

export type MenuEntry = MenuItem | "separator";

export interface MenuProps {
  /** The element that opens the menu (e.g. an icon Button). */
  trigger: ReactNode;
  items: MenuEntry[];
  /** Force-open (for previews / controlled use). */
  open?: boolean;
  /** Anchor the panel to the start (default) or end of the trigger. */
  align?: "start" | "end";
}

/**
 * Menu — an overflow / actions dropdown for per-record commands.
 *
 * Edit, delete, share, merge — the actions that don't deserve a permanent
 * button. Opens on trigger click (uncontrolled) or via `open`. Items render as
 * `role="menuitem"`; mark destructive ones `danger`. Panel layers at
 * `--z-dropdown`. (For deep `overflow:hidden` containers, render via a portal.)
 *
 * @example
 * <Menu trigger={<Button variant="ghost" aria-label="Actions">⋯</Button>} items={[
 *   { label: "Edit", onSelect: edit },
 *   "separator",
 *   { label: "Delete", danger: true, onSelect: del },
 * ]} />
 */
export function Menu({ trigger, items, open, align = "start" }: MenuProps) {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const uncontrolled = open === undefined;

  const menuClasses = ["fa-menu", align === "end" && "fa-menu--end"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fa-menu-wrap">
      <span
        style={{ display: "inline-flex" }}
        onClick={() => uncontrolled && setInternal((v) => !v)}
      >
        {trigger}
      </span>
      {isOpen && (
        <div className={menuClasses} role="menu">
          {items.map((it, i) =>
            it === "separator" ? (
              <div key={i} className="fa-menu__sep" role="separator" />
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                className={["fa-menu__item", it.danger && "fa-menu__item--danger"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  it.onSelect?.();
                  if (uncontrolled) setInternal(false);
                }}
              >
                {it.icon && <span className="fa-menu__item-icon">{it.icon}</span>}
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
