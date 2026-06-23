import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnchoredPopover } from "./AnchoredPopover";

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
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Dismiss on outside click / Escape (uncontrolled only). The panel is portaled
  // out of this subtree, so an "inside" click can land in either the trigger or
  // the panel — check both.
  useEffect(() => {
    if (!isOpen || !uncontrolled) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popRef.current?.contains(t)) {
        setInternal(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInternal(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, uncontrolled]);

  const menuClasses = ["fa-menu", align === "end" && "fa-menu--end"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fa-menu-wrap">
      <span
        ref={triggerRef}
        style={{ display: "inline-flex" }}
        onClick={() => uncontrolled && setInternal((v) => !v)}
      >
        {trigger}
      </span>
      <AnchoredPopover
        anchorRef={triggerRef}
        open={isOpen}
        align={align}
        matchWidth={false}
        className={menuClasses}
        role="menu"
        popRef={popRef}
      >
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
      </AnchoredPopover>
    </div>
  );
}
