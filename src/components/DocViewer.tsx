import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

export interface DocViewerProps {
  /** The document to inspect — an image, an embedded PDF, a rendered scan. */
  children: ReactNode;
  /**
   * Identity of the current document. When it changes the transform resets, so
   * swapping the file starts from a clean zoom/rotation.
   */
  resetKey?: string | number;
  /** Accessible name for the viewport. @default "Document viewer" */
  "aria-label"?: string;
  className?: string;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 6;
const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/**
 * DocViewer — a zoom / pan / rotate stage for inspecting a document.
 *
 * Drag to pan, scroll (or the toolbar) to zoom, rotate in 90° steps, and "fit"
 * to reset. The content is whatever you pass as `children` — an `<img>`, an
 * embedded PDF, a rendered certificate — so the viewport stays agnostic about
 * what it's showing. The floating toolbar reports the current zoom and resets it
 * on click. Pass `resetKey` (the file's id or URL) so the transform clears when
 * the document changes.
 *
 * Wheel-zoom uses a native non-passive listener, since React registers `wheel`
 * passively at the root and an `onWheel` handler can't `preventDefault` the page
 * scroll.
 *
 * @example
 * <DocViewer resetKey={file.id} aria-label={file.name}>
 *   <img src={file.url} alt={file.name} className="fa-docviewer__img" draggable={false} />
 * </DocViewer>
 */
export function DocViewer({
  children,
  resetKey,
  "aria-label": ariaLabel = "Document viewer",
  className,
}: DocViewerProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setRot(0);
    setOff({ x: 0, y: 0 });
  }, []);
  // A new document starts from a clean transform.
  useEffect(() => reset(), [resetKey, reset]);

  const zoomBy = (f: number) => setScale((s) => clamp(s * f));

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(s * (e.deltaY < 0 ? 1.12 : 0.89)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    setGrabbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOff({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };
  const onUp = () => {
    drag.current = null;
    setGrabbing(false);
  };

  return (
    <div className={["fa-docviewer", className].filter(Boolean).join(" ")}>
      <div
        ref={surfaceRef}
        className={["fa-docviewer__surface", grabbing && "grabbing"].filter(Boolean).join(" ")}
        role="group"
        aria-label={ariaLabel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className="fa-docviewer__content"
          style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${scale}) rotate(${rot}deg)` }}
        >
          {children}
        </div>
      </div>

      <div className="fa-docviewer__tools">
        <IconButton aria-label="Zoom out" onClick={() => zoomBy(0.83)}>
          <Icon name="zoomOut" />
        </IconButton>
        <button
          type="button"
          className="fa-docviewer__zoom"
          onClick={() => setScale(1)}
          title="Reset zoom"
          aria-label={`Zoom ${Math.round(scale * 100)} percent — reset`}
        >
          {Math.round(scale * 100)}%
        </button>
        <IconButton aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
          <Icon name="zoomIn" />
        </IconButton>
        <span className="fa-docviewer__sep" aria-hidden="true" />
        <IconButton aria-label="Rotate 90 degrees" onClick={() => setRot((r) => (r + 90) % 360)}>
          <Icon name="rotate" />
        </IconButton>
        <IconButton aria-label="Fit to screen" onClick={reset}>
          <Icon name="fit" />
        </IconButton>
      </div>
    </div>
  );
}
