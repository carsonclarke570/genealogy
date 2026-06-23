import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export interface AnchoredPopoverProps {
  /** The element the panel is positioned against (the trigger / control). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Whether the panel is shown. */
  open: boolean;
  /** Anchor to the start (default) or end edge of the trigger. */
  align?: "start" | "end";
  /** Gap in px between trigger and panel. @default 6 */
  gap?: number;
  /** Match the trigger's width unless `width` is set. @default true */
  matchWidth?: boolean;
  /** Fixed panel width in px (overrides `matchWidth`). */
  width?: number;
  className?: string;
  style?: CSSProperties;
  role?: string;
  id?: string;
  /**
   * Forwarded ref to the rendered panel node. Callers use it so their own
   * outside-click handlers can treat clicks inside the (portaled) panel as
   * "inside" — the panel no longer lives within the trigger's DOM subtree.
   */
  popRef?: MutableRefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * AnchoredPopover — renders a panel into a body-level portal and positions it as
 * `position: fixed` against an anchor element. Escaping the trigger's stacking
 * context is what keeps dropdowns from being clipped by `overflow: auto/hidden`
 * scroll containers (the app shell scrolls its content; the explorer canvas
 * clips) — the failure mode this exists to prevent.
 *
 * It owns positioning only: flips above the trigger when there's no room below,
 * clamps into the viewport, and re-places on scroll/resize. Open/close, focus,
 * keyboard, and outside-click stay with the calling component (which passes
 * `popRef` so its outside-click check can include this panel).
 */
export function AnchoredPopover({
  anchorRef,
  open,
  align = "start",
  gap = 6,
  matchWidth = true,
  width,
  className,
  style,
  role,
  id,
  popRef,
  children,
}: AnchoredPopoverProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null);
  // Portals need the DOM; guard SSR / first render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const pop = innerRef.current;
    if (!anchor || !pop) return;
    const r = anchor.getBoundingClientRect();
    const w = width ?? (matchWidth ? r.width : undefined);
    const popW = w ?? pop.offsetWidth;
    const popH = pop.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;

    let left = align === "end" ? r.right - popW : r.left;
    left = Math.max(8, Math.min(left, vw - popW - 8));

    // Below the trigger by default; flip above when it would overflow the
    // viewport and there is more room up top.
    let top = r.bottom + gap;
    if (top + popH > vh - 8 && r.top - gap - popH >= 8) {
      top = r.top - gap - popH;
    }
    top = Math.max(8, top);

    setPos({ top, left, width: w });
  }, [anchorRef, align, gap, matchWidth, width]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    const onScroll = () => place();
    // Capture phase so we react to any scrolling ancestor, not just window.
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(() => place());
    if (innerRef.current) ro.observe(innerRef.current);
    if (anchorRef.current) ro.observe(anchorRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, [open, place, anchorRef]);

  if (!open || !mounted) return null;

  const setRef = (el: HTMLDivElement | null) => {
    innerRef.current = el;
    if (popRef) popRef.current = el;
  };

  // Position before first paint via the layout effect; until measured, render
  // off-screen and transparent so there's no flash at (0,0).
  const placed: CSSProperties = pos
    ? { top: pos.top, left: pos.left, width: pos.width, right: "auto", bottom: "auto" }
    : { top: 0, left: 0, opacity: 0, pointerEvents: "none" };

  return createPortal(
    <div
      ref={setRef}
      className={className}
      role={role}
      id={id}
      style={{ position: "fixed", ...placed, ...style }}
    >
      {children}
    </div>,
    document.body,
  );
}
