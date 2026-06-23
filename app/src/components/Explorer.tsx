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
  placeAndYear,
} from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { buildFamilyGraph } from "@/lib/family-graph";
import { scopeFamily, homePerson, edgeWithinScope, type FrontierCount } from "@/lib/family-scope";
import {
  compute,
  lineage,
  countGenerations,
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

/**
 * Fog markers on a node that touches hidden kin: a small pill per direction
 * (ancestors / descendants / spouse-or-siblings) showing how many are out in the
 * fog. Clicking re-centres the scope on this node, pulling that direction in.
 * Direction → screen placement flips with the layout axis.
 */
function FrontierChips({ fc, mode, onExpand }: { fc: FrontierCount; mode: TreeMode; onExpand: () => void }) {
  const v = mode === "vertical";
  const chips: Array<{ key: string; n: number; arrow: string; style: CSSProperties }> = [
    { key: "up", n: fc.up, arrow: v ? "▲" : "◀",
      style: v ? { left: "50%", top: 0, transform: "translate(-50%,-128%)" }
               : { left: 0, top: "50%", transform: "translate(-112%,-50%)" } },
    { key: "down", n: fc.down, arrow: v ? "▼" : "▶",
      style: v ? { left: "50%", top: "100%", transform: "translate(-50%,28%)" }
               : { left: "100%", top: "50%", transform: "translate(12%,-50%)" } },
    { key: "side", n: fc.side, arrow: v ? "›" : "▾",
      style: v ? { left: "100%", top: "50%", transform: "translate(10%,-50%)" }
               : { left: "50%", top: "100%", transform: "translate(-50%,24%)" } },
  ];
  const dirName: Record<string, string> = { up: "ancestors", down: "descendants", side: "family" };
  return (
    <>
      {chips.filter((c) => c.n > 0).map((c) => (
        <button
          key={c.key}
          type="button"
          className="app-fog-chip"
          style={{ position: "absolute", ...c.style }}
          title={`${c.n} more ${dirName[c.key]} in the fog — click to explore`}
          onClick={onExpand}
        >
          <span aria-hidden="true">{c.arrow}</span>
          {c.n}
        </button>
      ))}
    </>
  );
}

function Tree({
  mode,
  overview,
  focusId,
  onFocus,
  onClear,
  onOpen,
  controlsRef,
}: {
  mode: TreeMode;
  overview: boolean;
  focusId: string | null;
  onFocus: (id: string) => void;
  onClear: () => void;
  onOpen: (id: string) => void;
  controlsRef: React.MutableRefObject<TreeControls | null>;
}) {
  const { people, graph, relationships } = useDataset();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ tx: 0, ty: 0, k: 1 });
  const [animate, setAnimate] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  // Two-finger pinch baseline (distance between touches) for touch zoom.
  const pinch = useRef<{ dist: number } | null>(null);
  // Whether the last pointer interaction was a pan (so the click that follows
  // mouseup doesn't get treated as a background "deselect" click).
  const moved = useRef(false);

  // Birth years give siblings a natural left-to-right order in the layout.
  const bornOf = useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const p of Object.values(people)) m[p.id] = p.born;
    return m;
  }, [people]);
  // Fog-of-war: in focus mode we lay out only a neighbourhood around the focus
  // (defaulting to a "home" person), so dense conflicts never have to be drawn.
  // Overview mode falls back to the whole graph with lineage dimming.
  const placedSet = useMemo(() => new Set(graph.placed), [graph]);
  const effFocus = useMemo(
    () => focusId ?? (overview ? null : homePerson(graph)),
    [focusId, overview, graph],
  );
  const scope = useMemo(
    () => (effFocus && !overview && placedSet.has(effFocus) ? scopeFamily(graph, effFocus, { bornOf }) : null),
    [effFocus, overview, placedSet, graph, bornOf],
  );
  const scopedGraph = useMemo(
    () => (scope ? buildFamilyGraph(relationships.filter(edgeWithinScope(scope.visible))) : graph),
    [scope, relationships, graph],
  );
  const layout = useMemo(() => compute(scopedGraph, mode, bornOf), [scopedGraph, mode, bornOf]);
  // Lineage dimming only applies in overview mode; in fog mode off-scope kin are
  // simply absent, so there is nothing to dim.
  const lin = useMemo(() => (overview && focusId ? lineage(graph, focusId) : null), [overview, graph, focusId]);
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

  // Frame the lit region: fit the (scoped) bounds to the viewport. In fog mode
  // those bounds are just the focus neighbourhood, so this keeps the whole lit
  // region on screen and centred; `smooth` animates the transform transition.
  const reframe = useCallback(
    (smooth: boolean) => {
      if (smooth) {
        setAnimate(true);
        if (animTimer.current) clearTimeout(animTimer.current);
        animTimer.current = setTimeout(() => setAnimate(false), 360);
      }
      fit();
    },
    [fit],
  );

  useEffect(() => {
    reframe(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effFocus, overview, mode, layout]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => reframe(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [reframe]);

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
      reset: () => reframe(true),
    };
  }, [controlsRef, reframe]);

  const onWheel = (e: React.WheelEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    setAnimate(false); // zoom should track the cursor 1:1, never lag behind a tween
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
    setAnimate(false); // dragging is direct manipulation — no tween
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
    moved.current = drag.current?.moved ?? false;
    drag.current = null;
  };
  // A click on empty canvas (not on a node, and not the tail of a pan) clears
  // the selected lineage — the natural "deselect" gesture.
  const onClick = (e: React.MouseEvent) => {
    if (moved.current) return;
    if ((e.target as HTMLElement).closest(".app-node")) return;
    if (focusId) onClear();
  };

  // Touch: one finger pans, two fingers pinch-zoom around their midpoint. The
  // canvas sets `touch-action: none`, so the browser won't scroll underneath us.
  const onTouchStart = (e: React.TouchEvent) => {
    setAnimate(false); // direct touch manipulation — no tween
    if (e.touches.length === 1) {
      const t = e.touches[0];
      drag.current = { x: t.clientX, y: t.clientY, tx: view.tx, ty: view.ty, moved: false };
      pinch.current = null;
    } else if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinch.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
      drag.current = null;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    if (e.touches.length === 2 && pinch.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = el.getBoundingClientRect();
      const cx = (a.clientX + b.clientX) / 2 - rect.left;
      const cy = (a.clientY + b.clientY) / 2 - rect.top;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const base = pinch.current.dist || dist;
      pinch.current = { dist };
      setView((v) => {
        const k = Math.max(0.3, Math.min(2.2, v.k * (dist / base)));
        const r = k / v.k;
        return { k, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r };
      });
    } else if (e.touches.length === 1 && drag.current) {
      const d = drag.current;
      const t = e.touches[0];
      const dx = t.clientX - d.x;
      const dy = t.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      moved.current = drag.current?.moved ?? false;
      drag.current = null;
      pinch.current = null;
    }
  };

  // Escape clears the selection / closes the peek panel.
  useEffect(() => {
    if (!focusId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId, onClear]);

  // An orthogonal connector between two points (parent-union anchor → child, or
  // a cross-generation spouse link). Vertical mode steps down; horizontal across.
  //
  // When the two ends are nearly aligned on the cross axis, the mid-point elbow
  // would draw a tiny jog that reads as a line failing to be straight. Below a
  // threshold we draw a single straight segment instead; above it the elbow's
  // jog is always at least MIN_JOG wide, so a real bend looks deliberate.
  const MIN_JOG = 12;
  function elbow(from: { x: number; y: number }, to: { x: number; y: number }) {
    const fx = from.x + ox;
    const fy = from.y + oy;
    const tx = to.x + ox;
    const ty = to.y + oy;
    if (mode === "vertical") {
      if (Math.abs(tx - fx) < MIN_JOG) return `M ${fx} ${fy} L ${tx} ${ty}`;
      const my = (fy + ty) / 2;
      return `M ${fx} ${fy} V ${my} H ${tx} V ${ty}`;
    }
    if (Math.abs(ty - fy) < MIN_JOG) return `M ${fx} ${fy} L ${tx} ${ty}`;
    const mx = (fx + tx) / 2;
    return `M ${fx} ${fy} H ${mx} V ${ty} H ${tx}`;
  }

  const edgeActive = (e: TreeEdge) => {
    if (!lin) return false;
    if (e.kind === "spouse") return lin.unions.has(e.union);
    return lin.unions.has(e.union) && lin.people.has(e.child);
  };

  // A spouse connector is a straight line when partners share a row, and an
  // elbow when a cross-generation marriage puts them on different rows.
  const spouseAligned = (e: Extract<TreeEdge, { kind: "spouse" }>) =>
    mode === "vertical" ? e.a.y === e.b.y : e.a.x === e.b.x;

  return (
    <div
      ref={wrapRef}
      className={"app-canvas app-scroll" + (drag.current ? " grabbing" : "")}
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        style={{
          position: "absolute",
          width: worldW,
          height: worldH,
          transformOrigin: "0 0",
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`,
          transition: animate && !drag.current ? "transform 320ms cubic-bezier(.4,0,.2,1)" : "none",
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
              if (spouseAligned(e)) {
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
                  d={elbow(e.a, e.b)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeDasharray={dash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            }
            return (
              <path
                key={i}
                d={elbow(e.from, e.to)}
                fill="none"
                stroke={stroke}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {layout.junctions.map((j, i) => {
            const active = !!lin && lin.unions.has(j.union);
            const stroke = active ? "var(--edge-active)" : "var(--edge)";
            const sw = active ? 2 : 1.5;
            const divorced = j.rel === "divorced";
            const ax = j.aDrop.x + ox, ay = j.aDrop.y + oy;
            const bx = j.bDrop.x + ox, by = j.bDrop.y + oy;
            const kx = j.knot.x + ox, ky = j.knot.y + oy;
            // A bracket dropping from both partners to the shared knot, with the
            // knot drawn as a marriage marker (filled = married, ring = divorced).
            const d =
              mode === "vertical"
                ? `M ${ax} ${ay} V ${ky} H ${bx} V ${by}`
                : `M ${ax} ${ay} H ${kx} V ${by} H ${bx}`;
            return (
              <g key={`j${i}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={sw}
                  strokeDasharray={divorced ? "4 3" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx={kx}
                  cy={ky}
                  r={4}
                  fill={divorced ? "var(--color-bg)" : stroke}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </svg>

        {Object.values(layout.nodes).map((n) => {
          const p = people[n.id];
          const isFocus = effFocus === n.id;
          const inPath = !!lin && lin.people.has(n.id) && !isFocus;
          const dim = !!lin && !lin.people.has(n.id);
          const summary = provSummary(p);
          const fc = overview ? undefined : scope?.frontier.get(n.id);
          return (
            <div
              key={n.id}
              className={"app-node" + (dim ? " dim" : "")}
              style={{ left: n.x + ox, top: n.y + oy, width: n.w, height: n.h }}
            >
              <PersonNode
                name={shortName(p)}
                birth={p.born != null ? String(p.born) : undefined}
                death={p.living || p.died == null ? undefined : String(p.died)}
                living={p.living}
                focused={isFocus}
                inPath={inPath}
                hasDocuments={docCount(p) > 0}
                style={{ height: "100%", maxWidth: "none" }}
                onClick={() => {
                  if (!drag.current || !drag.current.moved) onFocus(n.id);
                }}
                onDoubleClick={() => onOpen(n.id)}
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
              {fc && (
                <FrontierChips
                  fc={fc}
                  mode={mode}
                  onExpand={() => {
                    if (!drag.current || !drag.current.moved) onFocus(n.id);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A titled list of related people in the peek panel; hidden when empty. */
function PeekSection({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: { id: string; rel?: string }[];
  onOpen: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: "var(--space-lg)" }}>
      <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: "var(--space-sm)" }}>
        {items.map((r) => (
          <MiniNode key={r.id} id={r.id} rel={r.rel} onOpen={onOpen} />
        ))}
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
  const { people, graph } = useDataset();
  const p = people[id];
  const rel = relationsOf(graph, id);

  return (
    <div className="app-peek app-scroll">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="app-label">Focused person</span>
        <button className="app-iconbtn" onClick={onClose} aria-label="Close">
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
          <span>{placeAndYear(p.born, p.bornPlace)}</span>
          <ProvenanceMark status={provOf(p, "born")} />
        </div>
        {!p.living && (
          <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
            <span className="app-muted" style={{ width: 48, flex: "none" }}>
              Died
            </span>
            <span>{placeAndYear(p.died, p.diedPlace)}</span>
            <ProvenanceMark status={provOf(p, "died")} />
          </div>
        )}
      </div>
      <PeekSection title="Parents" items={rel.parents} onOpen={onFocusRelative} />
      <PeekSection title="Spouse" items={rel.spouse} onOpen={onFocusRelative} />
      <PeekSection title="Children" items={rel.children} onOpen={onFocusRelative} />
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

/**
 * Holding tray for people who aren't drawn on the canvas — those with no
 * recorded relationship, so the layout produces no node for them. Rather than
 * float them as lone "root" nodes (which would imply a generation we don't
 * know), they live in a quiet, collapsible shelf docked at the bottom of the
 * canvas. Opening one focuses it; its Edit form is where you connect it into the
 * tree (adding any relationship moves it off the shelf onto the canvas).
 */
function UnplacedShelf({
  ids,
  focusId,
  onFocus,
}: {
  ids: string[];
  focusId: string | null;
  onFocus: (id: string) => void;
}) {
  const { people } = useDataset();
  const [open, setOpen] = useState(false);

  return (
    <div className={"app-float app-shelf" + (open ? " open" : "")}>
      <button
        type="button"
        className="app-shelf-pill"
        aria-expanded={open}
        aria-controls="unplaced-shelf-body"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="app-shelf-dot" aria-hidden="true" />
        <span className="app-shelf-label">
          Unplaced<span className="app-muted"> · {ids.length}</span>
        </span>
        <span className="app-shelf-chev" aria-hidden="true">
          <Icon name="chevron" size={16} />
        </span>
      </button>
      <div className="app-shelf-body" id="unplaced-shelf-body">
        <div>
          <div className="app-shelf-inner">
            <p className="app-shelf-hint app-muted">
              Not yet connected to anyone in the tree. Open one to review it or add relationships.
            </p>
            <div className="app-shelf-row app-scroll">
              {ids.map((id) => {
                const p = people[id];
                if (!p) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    className={"app-shelf-card" + (focusId === id ? " active" : "")}
                    onClick={() => onFocus(id)}
                  >
                    <Avatar name={`${p.given} ${p.surname}`} size="sm" />
                    <span style={{ minWidth: 0 }}>
                      <span className="nm">{shortName(p)}</span>
                      <span className="dt tnum">{lifeDates(p)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
  onBack,
  focusTrail,
  onOpen,
}: {
  layout: TreeMode;
  setLayout: (m: TreeMode) => void;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  onBack: () => void;
  focusTrail: string[];
  onOpen: (id: string, mode?: "edit") => void;
}) {
  const controls = useRef<TreeControls | null>(null);
  const { people, graph } = useDataset();
  const [overview, setOverview] = useState(false);
  const opts: [TreeMode, string][] = [
    ["vertical", "Vertical"],
    ["horizontal", "Horizontal"],
  ];

  // People the canvas can't draw: those in no relationship, so the graph never
  // places them. Mode-independent — mirrors the layout's node membership.
  const unplaced = useMemo(() => {
    const placed = new Set(graph.placed);
    return Object.keys(people).filter((id) => !placed.has(id));
  }, [people, graph]);

  const generations = useMemo(() => countGenerations(graph), [graph]);

  const personCount = Object.keys(people).length;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Tree
        mode={layout}
        overview={overview}
        focusId={focusId}
        onFocus={setFocusId}
        onClear={() => setFocusId(null)}
        onOpen={(id) => onOpen(id)}
        controlsRef={controls}
      />

      <div className="app-float app-canvas-title" style={{ position: "absolute", top: 16, left: 16, padding: "12px 16px", zIndex: 4 }}>
        <div className="app-display" style={{ fontSize: "var(--text-headline)" }}>
          Our Family
        </div>
        <div className="app-muted app-canvas-sub" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
          {generations} {generations === 1 ? "generation" : "generations"} · {personCount} {personCount === 1 ? "person" : "people"} · double-click to open a record
        </div>
      </div>

      <div
        className="app-float app-switch-wrap app-viewbar"
        style={{ position: "absolute", top: 16, right: focusId ? 392 : 16, zIndex: 4, transition: "right .2s ease" }}
      >
        <div className="app-seg" role="group" aria-label="Tree orientation">
          {opts.map(([k, label]) => (
            <button key={k} className={"app-segbtn" + (layout === k ? " on" : "")} onClick={() => setLayout(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className="app-view-divider" aria-hidden="true" />
        <div className="app-seg" role="group" aria-label="What to show">
          <button className={"app-segbtn" + (!overview ? " on" : "")} onClick={() => setOverview(false)}>
            Focus
          </button>
          <button className={"app-segbtn" + (overview ? " on" : "")} onClick={() => setOverview(true)}>
            Overview
          </button>
        </div>
      </div>

      <div className="app-float app-seg app-zoomctl" style={{ ...segWrap, bottom: 16, left: 16 }}>
        {!overview && focusTrail.length > 0 && (
          <button className="app-iconbtn" onClick={onBack} aria-label="Back" title="Back to previous person">
            <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
          </button>
        )}
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

      {unplaced.length > 0 && (
        <UnplacedShelf ids={unplaced} focusId={focusId} onFocus={setFocusId} />
      )}

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
