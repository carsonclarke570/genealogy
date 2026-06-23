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
      if (e.key === "Escape") {
        setInternal(false);
        (triggerRef.current?.querySelector("button, [tabindex], a") as HTMLElement | null)?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, uncontrolled]);

  // Focus the first item when the menu opens (next frame — the panel mounts via
  // a portal), so arrow keys work immediately and focus is trapped sensibly.
  useEffect(() => {
    if (!isOpen || !uncontrolled) return;
    const raf = requestAnimationFrame(() => {
      popRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, uncontrolled]);

  // Roving arrow-key navigation between the (enabled) items.
  const onItemKeyDown = (e: React.KeyboardEvent) => {
    const items = popRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    );
    if (!items?.length) return;
    const arr = Array.from(items);
    const i = arr.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      arr[(i + 1) % arr.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      arr[(i - 1 + arr.length) % arr.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      arr[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      arr[arr.length - 1]?.focus();
    }
  };

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
                onKeyDown={onItemKeyDown}
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
