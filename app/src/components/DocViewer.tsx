"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@family-archive/ui";
import { Icon } from "./Icon";

/**
 * DocViewer — a zoom / pan / rotate stage over an image, so a curator can read a
 * scan while typing the metadata beside it. Drag to pan, scroll (or the toolbar)
 * to zoom, rotate in 90° steps, and "fit" to reset. Images only; PDFs keep their
 * own embedded viewer at the call site (the design-system MediaPreview). Shared
 * by the full-screen upload and edit screens.
 */
export function DocViewer({ url, name }: { url: string; name: string }) {
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
  // A new document (replaced file / different media) starts from a clean transform.
  useEffect(() => reset(), [url, reset]);

  const clamp = (s: number) => Math.min(6, Math.max(0.25, s));

  // Wheel-to-zoom needs a non-passive listener: React registers `wheel` at the
  // root as passive, so an onWheel handler can't call preventDefault to stop the
  // page from scrolling. Attach it natively instead.
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

  const zoomBy = (f: number) => setScale((s) => clamp(s * f));

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    setGrabbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOff({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const onUp = () => {
    drag.current = null;
    setGrabbing(false);
  };

  return (
    <div className="app-doc-stage">
      <div
        ref={surfaceRef}
        className={"app-doc-surface" + (grabbing ? " grabbing" : "")}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="app-doc-content" style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${scale}) rotate(${rot}deg)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={name} className="app-doc-img" draggable={false} />
        </div>
      </div>

      <div className="app-doc-tools">
        <IconButton aria-label="Zoom out" onClick={() => zoomBy(0.83)}>
          <Icon name="zoomOut" />
        </IconButton>
        <button type="button" className="app-doc-zoom" onClick={() => setScale(1)} title="Reset zoom">
          {Math.round(scale * 100)}%
        </button>
        <IconButton aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
          <Icon name="zoomIn" />
        </IconButton>
        <span className="app-doc-sep" />
        <IconButton aria-label="Rotate 90°" onClick={() => setRot((r) => (r + 90) % 360)}>
          <Icon name="rotate" />
        </IconButton>
        <IconButton aria-label="Fit to screen" onClick={reset}>
          <Icon name="recenter" />
        </IconButton>
      </div>
    </div>
  );
}
