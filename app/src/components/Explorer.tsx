"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { Avatar, Badge, Button, PersonNode } from "@family-archive/ui";
import {
  shortName,
  fullName,
  lifeDates,
  docCount,
  provOf,
  provSummary,
  relationsOf,
} from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import {
  compute,
  lineage,
  type TreeMode,
  type TreeEdge,
} from "@/lib/tree-layout";
import { Icon } from "./Icon";
import { MiniNode } from "./shared";
import { ProvenanceMark } from "@family-archive/ui";

interface View {
  tx: number;
  ty: number;
  k: number;
}
interface TreeControls {
  zoom: (f: number) => void;
  reset: () => void;
}

function Tree({
  mode,
  focusId,
  onFocus,
  controlsRef,
}: {
  mode: TreeMode;
  focusId: string | null;
  onFocus: (id: string) => void;
  controlsRef: React.MutableRefObject<TreeControls | null>;
}) {
  const { people, units } = useDataset();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ tx: 0, ty: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const layout = useMemo(() => compute(units, mode), [units, mode]);
  const lin = useMemo(() => (focusId ? lineage(units, focusId) : null), [units, focusId]);
  const b = layout.bounds;
  const worldW = b.maxX - b.minX;
  const worldH = b.maxY - b.minY;
  const ox = -b.minX;
  const oy = -b.minY;

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const k = Math.min(cw / worldW, ch / worldH, 1.05) * 0.92;
    setView({ k, tx: (cw - worldW * k) / 2, ty: (ch - worldH * k) / 2 });
  }, [worldW, worldH]);

  useEffect(() => {
    fit();
  }, [mode, fit]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  useEffect(() => {
    controlsRef.current = {
      zoom: (f) =>
        setView((v) => {
          const el = wrapRef.current;
          if (!el) return v;
          const cx = el.clientWidth / 2;
          const cy = el.clientHeight / 2;
          const k = Math.max(0.3, Math.min(2.2, v.k * f));
          const r = k / v.k;
          return { k, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r };
        }),
      reset: fit,
    };
  }, [controlsRef, fit]);

  const onWheel = (e: React.WheelEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const f = e.deltaY < 0 ? 1.1 : 0.9;
      const k = Math.max(0.3, Math.min(2.2, v.k * f));
      const r = k / v.k;
      return { k, tx: mx - (mx - v.tx) * r, ty: my - (my - v.ty) * r };
    });
  };
  const onDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
  };
  const onMove = (e: React.MouseEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    // Close over the captured `d`, not the mutable `drag.current` ref: React may
    // replay this updater during a later render, by which point endDrag may have
    // set drag.current = null (was throwing "Cannot read properties of null").
    setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  };
  const endDrag = () => {
    drag.current = null;
  };

  function parentPath(e: Extract<TreeEdge, { kind: "parent" }>) {
    const fx = e.from.x + ox;
    const fy = e.from.y + oy;
    const tx = e.to.x + ox;
    const ty = e.to.y + oy;
    if (mode === "vertical") {
      const my = (fy + ty) / 2;
      return `M ${fx} ${fy} V ${my} H ${tx} V ${ty}`;
    }
    if (mode === "horizontal") {
      const mx = (fx + tx) / 2;
      return `M ${fx} ${fy} H ${mx} V ${ty} H ${tx}`;
    }
    return `M ${fx} ${fy} L ${tx} ${ty}`;
  }

  const edgeActive = (e: TreeEdge) => {
    if (!lin) return false;
    if (e.kind === "spouse") return lin.units.has(e.unitId);
    return lin.units.has(e.childUnit) && lin.units.has(e.parentUnit);
  };

  return (
    <div
      ref={wrapRef}
      className={"app-canvas app-scroll" + (drag.current ? " grabbing" : "")}
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <div
        style={{
          position: "absolute",
          width: worldW,
          height: worldH,
          transformOrigin: "0 0",
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`,
        }}
      >
        <svg
          width={worldW}
          height={worldH}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {layout.edges.map((e, i) => {
            const active = edgeActive(e);
            const stroke = active ? "var(--edge-active)" : "var(--edge)";
            const sw = active ? 2 : 1.5;
            if (e.kind === "spouse") {
              const dash = e.rel === "divorced" ? "4 3" : undefined;
              return (
                <line
                  key={i}
                  x1={e.a.x + ox}
                  y1={e.a.y + oy}
                  x2={e.b.x + ox}
                  y2={e.b.y + oy}
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeDasharray={dash}
                  strokeLinecap="round"
                />
              );
            }
            return (
              <path
                key={i}
                d={parentPath(e)}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>

        {Object.values(layout.nodes).map((n) => {
          const p = people[n.id];
          const isFocus = focusId === n.id;
          const inPath = !!lin && lin.people.has(n.id) && !isFocus;
          const dim = !!lin && !lin.people.has(n.id);
          const summary = provSummary(p);
          return (
            <div
              key={n.id}
              className={"app-node" + (dim ? " dim" : "")}
              style={{ left: n.x + ox, top: n.y + oy, width: n.w, height: n.h }}
            >
              <PersonNode
                name={shortName(p)}
                birth={String(p.born)}
                death={p.living ? undefined : String(p.died)}
                living={p.living}
                focused={isFocus}
                inPath={inPath}
                hasDocuments={docCount(p) > 0}
                style={{ height: "100%", maxWidth: "none" }}
                onClick={() => {
                  if (!drag.current || !drag.current.moved) onFocus(n.id);
                }}
              />
              <span
                title={`${summary.label} — ${docCount(p)} documents`}
                style={{
                  position: "absolute",
                  top: 7,
                  right: 7,
                  width: 18,
                  height: 18,
                  borderRadius: "999px",
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: summary.color,
                  zIndex: 2,
                }}
              >
                <Icon name={summary.icon} size={11} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Peek({
  id,
  onClose,
  onOpen,
  onFocusRelative,
}: {
  id: string;
  onClose: () => void;
  onOpen: (id: string, mode?: "edit") => void;
  onFocusRelative: (id: string) => void;
}) {
  const { people, units } = useDataset();
  const p = people[id];
  const rel = relationsOf(units, id);
  const Section = ({ title, items }: { title: string; items: { id: string; rel?: string }[] }) =>
    items.length ? (
      <div style={{ marginTop: "var(--space-lg)" }}>
        <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
          {title}
        </div>
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          {items.map((r) => (
            <MiniNode key={r.id} id={r.id} rel={r.rel} onOpen={onFocusRelative} />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="app-peek app-scroll">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="app-label">Focused person</span>
        <button className="app-iconbtn" onClick={onClose} aria-label="Close" style={{ width: 28, height: 28 }}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center", marginTop: "var(--space-md)" }}>
        <Avatar name={fullName(p)} size="lg" />
        <div style={{ minWidth: 0 }}>
          <div
            className="app-display"
            style={{ fontSize: "var(--text-headline)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {shortName(p)}
          </div>
          <div className="app-muted tnum" style={{ fontSize: "var(--text-body-sm)" }}>
            {lifeDates(p)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
        <Badge tone="neutral" dot>
          {p.living ? "Living" : "Deceased"}
        </Badge>
        {docCount(p) > 0 && <Badge tone="info">{docCount(p)} documents</Badge>}
      </div>
      <div style={{ marginTop: "var(--space-lg)", display: "grid", gap: 6, fontSize: "var(--text-body-sm)" }}>
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <span className="app-muted" style={{ width: 48, flex: "none" }}>
            Born
          </span>
          <span>
            {p.born} · {p.bornPlace}
          </span>
          <ProvenanceMark status={provOf(p, "born")} />
        </div>
        {!p.living && (
          <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
            <span className="app-muted" style={{ width: 48, flex: "none" }}>
              Died
            </span>
            <span>
              {p.died} · {p.diedPlace}
            </span>
            <ProvenanceMark status={provOf(p, "died")} />
          </div>
        )}
      </div>
      <Section title="Parents" items={rel.parents} />
      <Section title="Spouse" items={rel.spouse} />
      <Section title="Children" items={rel.children} />
      <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-xl)" }}>
        <Button variant="primary" fullWidth onClick={() => onOpen(id)}>
          View full record
        </Button>
        <Button
          variant="secondary"
          iconStart={<Icon name="edit" size={16} />}
          aria-label="Edit"
          onClick={() => onOpen(id, "edit")}
        />
      </div>
    </div>
  );
}

const segWrap: CSSProperties = { position: "absolute", padding: "4px", zIndex: 4 };

export function Explorer({
  layout,
  setLayout,
  focusId,
  setFocusId,
  onOpen,
}: {
  layout: TreeMode;
  setLayout: (m: TreeMode) => void;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  onOpen: (id: string, mode?: "edit") => void;
}) {
  const controls = useRef<TreeControls | null>(null);
  const opts: [TreeMode, string][] = [
    ["vertical", "Vertical"],
    ["horizontal", "Horizontal"],
    ["radial", "Radial"],
  ];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Tree mode={layout} focusId={focusId} onFocus={setFocusId} controlsRef={controls} />

      <div className="app-float app-canvas-title" style={{ position: "absolute", top: 16, left: 16, padding: "12px 16px", zIndex: 4 }}>
        <div className="app-display" style={{ fontSize: "var(--text-headline)" }}>
          Whitfield Family
        </div>
        <div className="app-muted app-canvas-sub" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
          5 generations · 16 people · double-click to open a record
        </div>
      </div>

      <div
        className="app-float app-seg app-switch-wrap"
        style={{ ...segWrap, top: 16, right: focusId ? 392 : 16, transition: "right .2s ease" }}
      >
        {opts.map(([k, label]) => (
          <button key={k} className={"app-segbtn" + (layout === k ? " on" : "")} onClick={() => setLayout(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="app-float app-seg app-zoomctl" style={{ ...segWrap, bottom: 16, left: 16 }}>
        <button className="app-iconbtn" onClick={() => controls.current?.zoom(0.83)} aria-label="Zoom out">
          <Icon name="zoomOut" />
        </button>
        <button className="app-iconbtn" onClick={() => controls.current?.zoom(1.2)} aria-label="Zoom in">
          <Icon name="zoomIn" />
        </button>
        <button className="app-iconbtn" onClick={() => controls.current?.reset()} aria-label="Recenter">
          <Icon name="recenter" />
        </button>
      </div>

      {focusId && (
        <Peek
          id={focusId}
          onClose={() => setFocusId(null)}
          onOpen={onOpen}
          onFocusRelative={(pid) => setFocusId(pid)}
        />
      )}
    </div>
  );
}
