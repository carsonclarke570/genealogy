"use client";

/**
 * Family Map — a geographic view of how the family moved over time.
 *
 * Every person's path is derived from facts already in the archive (birth,
 * located life-events, immigration, residences, death) by lib/map-journey.ts,
 * which reads the in-memory Dataset + the coordinate gazetteer. Built on Leaflet
 * with CARTO basemaps; the migration overlay (arcs, arrows, pins, clusters,
 * corridors) is hand-drawn so it stays on the archive palette and flips with the
 * theme. Ported from the design prototype (hf/map-page.jsx).
 *
 * Leaflet is loaded lazily inside an effect (it touches `window` at import), so
 * this client component still server-renders.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type * as LT from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Avatar,
  Badge,
  Button,
  Combobox,
  EmptyState,
  IconBadge,
  IconButton,
  Input,
  ProvenanceMark,
  Slider,
  Switch,
} from "@family-archive/ui";
import { useDataset } from "@/lib/dataset";
import { fullName, lifeDates, type Dataset } from "@/lib/family-data";
import { EVENT_META, fmtDate } from "@/lib/timeline";
import {
  bounds as journeyBounds,
  corridors as buildCorridors,
  journeyOf,
  largestLineage,
  lineCls,
  lineColorFor,
  lineColorOf,
  lineages as buildLineages,
  selectPeople,
  unmappedPlaces as buildUnmapped,
  yearSpan,
  type Journey,
  type MapNode,
  type UnmappedPlace,
} from "@/lib/map-journey";
import { setPlaceCoords } from "@/lib/actions";
import { Icon, type IconName } from "./Icon";
import type { Theme } from "@/lib/theme";

const CORRIDOR_THRESHOLD = 10; // above this many people → aggregate into corridors
const CARTO = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

const firstGiven = (given: string) => given.split(" ")[0];

// ── geometry helpers ─────────────────────────────────────────────────────────
/** A quadratic-bézier arc between two lat/lngs, bulged perpendicular to the line. */
function arcPts(a: [number, number], b: [number, number], bulge: number): [number, number][] {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.hypot(dLat, dLng) || 1e-6;
  const nx = -dLng / dist;
  const ny = dLat / dist;
  const off = dist * bulge;
  const cLat = (lat1 + lat2) / 2 + nx * off;
  const cLng = (lng1 + lng2) / 2 + ny * off;
  const pts: [number, number][] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    pts.push([
      u * u * lat1 + 2 * u * t * cLat + t * t * lat2,
      u * u * lng1 + 2 * u * t * cLng + t * t * lng2,
    ]);
  }
  return pts;
}
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const nodeLabel = (n: MapNode) => (n.sub ? `${n.sub}, ${n.place}` : n.place);

// A visible node on the canvas, with its lineage colour resolved.
interface VisNode {
  lat: number;
  lng: number;
  cls: string;
  col: string;
  id: string;
  node: MapNode;
  isActive: boolean;
  dim: boolean;
  kind: MapNode["kind"];
  pt?: LT.Point;
}

type Focus =
  | { personId: string; node: MapNode }
  | { cluster: { persons: ClusterPerson[] } }
  | { corridor: { from: string; to: string; people: string[]; voyage: boolean } };

interface ClusterPerson {
  id: string;
  cls: string;
  col: string;
  nodes: MapNode[];
}

interface RenderCache {
  edges: Map<string, LT.Polyline>;
  arrows: Map<string, LT.Marker>;
  nodes: Map<string, LT.Marker>;
  corr: LT.Polyline[];
  chev: SVGTextElement[];
  clusters: LT.Marker[];
  sig: string;
}

export function FamilyMap({ theme = "light", onOpen }: { theme?: Theme; onOpen: (id: string) => void }) {
  const dataset = useDataset();
  const { people } = dataset;

  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LT.Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const layerRef = useRef<LT.LayerGroup | null>(null);
  const tileRef = useRef<LT.TileLayer | null>(null);
  const cacheRef = useRef<RenderCache>({
    edges: new Map(),
    arrows: new Map(),
    nodes: new Map(),
    corr: [],
    chev: [],
    clusters: [],
    sig: "",
  });
  const [ready, setReady] = useState(false);
  const [, startTransition] = useTransition();

  const defaultLineage = useMemo(() => largestLineage(dataset) || "", [dataset]);
  const [lineage, setLineage] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [showUndated, setShowUndated] = useState(false);
  // Default the lineage filter to the largest line once the data is known.
  useEffect(() => setLineage(defaultLineage), [defaultLineage]);

  const span = useMemo(() => yearSpan(dataset), [dataset]);
  const [year, setYear] = useState(span.max);
  useEffect(() => setYear(span.max), [span.max]);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(3);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [unmappedOpen, setUnmappedOpen] = useState(false);

  const placingRef = useRef<string | null>(null);
  useEffect(() => {
    placingRef.current = placing;
  }, [placing]);

  const atEnd = year >= span.max;
  const filtersActive = lineage !== defaultLineage || !!personId || showUndated;

  const renderIds = useMemo(
    () => selectPeople(dataset, { lineage, personId }).filter((id) => journeyOf(id, dataset).nodes.length > 0),
    [dataset, lineage, personId],
  );
  const activeId = personId || (focus && "personId" in focus ? focus.personId : null);
  const corridorMode = renderIds.length > CORRIDOR_THRESHOLD && !activeId;
  const unmapped = useMemo(() => buildUnmapped(dataset), [dataset]);

  // Commit a pin-drop for the place currently being located (persisted server-side).
  const commitPin = (lat: number, lng: number) => {
    const ps = placingRef.current;
    if (!ps) return;
    setPlacing(null);
    startTransition(async () => {
      await setPlaceCoords(ps, +lat.toFixed(4), +lng.toFixed(4));
    });
  };

  // ── init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      const L = (mod.default ?? mod) as typeof import("leaflet");
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, {
        zoomControl: false,
        attributionControl: true,
        worldCopyJump: true,
        minZoom: 2,
        maxZoom: 12,
      }).setView([47, -35], 3);
      const url = CARTO[theme === "dark" ? "dark" : "light"];
      tileRef.current = L.tileLayer(url, {
        subdomains: "abcd",
        maxZoom: 19,
        detectRetina: true,
        attribution: "&copy; OpenStreetMap &copy; CARTO",
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e: LT.LeafletMouseEvent) => {
        if (placingRef.current) commitPin(e.latlng.lat, e.latlng.lng);
        else setFocus(null);
      });
      map.on("zoomend", () => setZoom(map.getZoom()));
      mapRef.current = map;
      setNarrow(window.innerWidth < 1080);
      setTimeout(() => {
        map.invalidateSize();
        setReady(true);
      }, 60);
    });
    const onResize = () => {
      mapRef.current?.invalidateSize();
      setNarrow(window.innerWidth < 1080);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // theme → swap basemap
  useEffect(() => {
    tileRef.current?.setUrl(CARTO[theme === "dark" ? "dark" : "light"]);
  }, [theme]);

  // ── draw overlay (reconciling renderer; layers reused across frames) ────────
  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    const L = LRef.current;
    if (!map || !group || !L || !ready) return;
    const C = cacheRef.current;
    const cutoff = year;

    const sig =
      renderIds.join(",") +
      "|" +
      (activeId || "") +
      "|" +
      showUndated +
      "|" +
      theme +
      "|" +
      (playing ? "P" : "S") +
      "|z" +
      zoom +
      "|" +
      (corridorMode ? "C" : "I");
    if (C.sig !== sig) {
      group.clearLayers();
      C.edges.clear();
      C.arrows.clear();
      C.nodes.clear();
      C.clusters = [];
      C.corr = [];
      C.chev = [];
      C.sig = sig;
    }

    const seenE = new Set<string>();
    const seenA = new Set<string>();
    const seenN = new Set<string>();
    const visNodes: VisNode[] = [];
    const order = renderIds.slice().sort((a, b) => (a === activeId ? 1 : 0) - (b === activeId ? 1 : 0));

    const singlePin = (v: VisNode, scale: number, op: number): LT.Marker => {
      const n = v.node;
      const html =
        `<span class="mig-pt mig-pt--${v.kind} line-${v.cls}${v.isActive ? " mig-active" : ""}${
          v.dim ? " mig-dim" : ""
        }" style="--ln:${v.col};transform:scale(${scale.toFixed(3)});opacity:${op.toFixed(3)}"></span>`;
      const icon = L.divIcon({ className: "mig-pt-wrap", html, iconSize: [20, 20], iconAnchor: [10, 10] });
      const m = L.marker([v.lat, v.lng], {
        icon,
        riseOnHover: true,
        zIndexOffset: v.isActive ? 1000 : v.kind === "birth" || v.kind === "death" ? 200 : 0,
      }).addTo(group);
      const p = people[v.id];
      const yrLbl = !n.dated
        ? "date unknown"
        : n.firstYear === n.lastYear
          ? n.firstYear
          : `${n.firstYear}–${n.lastYear}`;
      m.bindTooltip(
        `<b>${nodeLabel(n)}</b> · ${yrLbl}<br>${firstGiven(p.given)} ${p.surname}`,
        { direction: "top", className: "mig-tip", offset: [0, -8] },
      );
      m.on("click", (e: LT.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setFocus({ personId: v.id, node: n });
      });
      return m;
    };

    // ── per-person arcs (only below the corridor threshold) ───────────────────
    if (!corridorMode) {
      for (const id of order) {
        const j = journeyOf(id, dataset, { includeUndated: showUndated && atEnd });
        const byKey: Record<string, MapNode> = {};
        j.nodes.forEach((n) => (byKey[n.key] = n));
        const isActive = id === activeId;
        const cls = lineCls(people[id]?.surname);
        const col = lineColorOf(dataset, id);
        const dim = !!activeId && !isActive;

        for (const ed of j.edges) {
          const a = byKey[ed.from];
          const b = byKey[ed.to];
          if (!a || !b) continue;
          if (ed.undated && !(showUndated && atEnd)) continue;
          const t1 = ed.year != null ? ed.year : span.max;
          const t0 = a.dated && a.firstYear != null ? a.firstYear : t1;
          let prog = 1;
          if (!ed.undated) {
            if (cutoff < t0) continue; // journey hasn't reached this leg
            prog = t1 > t0 ? (cutoff - t0) / (t1 - t0) : 1;
            prog = Math.max(0, Math.min(1, prog));
          }
          const bulge = ed.kind === "voyage" ? 0.22 : ed.kind === "branch" ? 0.3 : 0.12;
          const full = arcPts([a.lat, a.lng], [b.lat, b.lng], bulge);
          const growing = prog < 1;
          const pts = growing ? full.slice(0, Math.max(2, Math.ceil(prog * full.length))) : full;
          const ekey = `${id}|${ed.from}>${ed.to}`;
          let line = C.edges.get(ekey);
          if (!line) {
            const className = ["mig-edge", `mig-edge--${ed.kind}`, `line-${cls}`, isActive ? "mig-active" : "", dim ? "mig-dim" : ""].join(" ");
            line = L.polyline(pts, { className, weight: isActive ? 3.5 : 2.5, opacity: 1, interactive: false }).addTo(group);
            const pe = line.getElement() as SVGElement | null;
            pe?.style.setProperty("--ln", col);
            C.edges.set(ekey, line);
          } else {
            line.setLatLngs(pts);
          }
          seenE.add(ekey);

          if (!ed.undated) {
            const ref = growing ? pts : full;
            const i = growing ? ref.length - 1 : Math.round(ref.length * 0.58);
            const q1 = map.latLngToLayerPoint(ref[Math.max(0, i - 1)]);
            const q2 = map.latLngToLayerPoint(ref[Math.min(ref.length - 1, i)]);
            const ang = (Math.atan2(q2.y - q1.y, q2.x - q1.x) * 180) / Math.PI;
            let ar = C.arrows.get(ekey);
            if (!ar) {
              const arrow = L.divIcon({
                className: "mig-arrow-wrap",
                html: `<span class="mig-arrow line-${cls}${isActive ? " mig-active" : ""}${dim ? " mig-dim" : ""}" style="--ln:${col}">➤</span>`,
                iconSize: [16, 16],
              });
              ar = L.marker(ref[i], { icon: arrow, interactive: false, keyboard: false }).addTo(group);
              C.arrows.set(ekey, ar);
            } else {
              ar.setLatLng(ref[i]);
            }
            const el = ar.getElement();
            const glyph = el?.firstChild as HTMLElement | null;
            if (glyph) glyph.style.transform = `rotate(${ang}deg)`;
            seenA.add(ekey);
          }
        }
      }
    }

    // ── collect every visible node (for clustering / pins) ────────────────────
    for (const id of order) {
      const j = journeyOf(id, dataset, { includeUndated: showUndated && atEnd });
      const isActive = id === activeId;
      const cls = lineCls(people[id]?.surname);
      const col = lineColorOf(dataset, id);
      const dim = !!activeId && !isActive;
      for (const n of j.nodes) {
        if (!n.dated) {
          if (!(showUndated && atEnd)) continue;
        } else if (n.firstYear != null && n.firstYear > cutoff) continue;
        const v: VisNode = { lat: n.lat, lng: n.lng, cls, col, id, node: n, isActive, dim, kind: n.kind };
        visNodes.push(v);
        if (!playing || corridorMode) continue;
        let scale = 1;
        let op = 1;
        if (n.dated && n.firstYear != null) {
          const age = cutoff - n.firstYear;
          const GROW = 2.4;
          if (age < GROW) {
            const e = easeOut(Math.max(0, age) / GROW);
            scale = 0.18 + 0.82 * e;
            op = Math.min(1, 0.25 + e);
          }
        }
        let m = C.nodes.get(n.key);
        if (!m) {
          m = singlePin(v, scale, op);
          C.nodes.set(n.key, m);
        } else {
          const el = m.getElement();
          const dot = el?.firstChild as HTMLElement | null;
          if (dot) {
            dot.style.transform = `scale(${scale.toFixed(3)})`;
            dot.style.opacity = op.toFixed(3);
          }
        }
        seenN.add(n.key);
      }
    }

    // ── aggregated migration corridors (replace per-person arcs at scale) ─────
    C.corr.forEach((l) => group.removeLayer(l));
    C.corr = [];
    C.chev.forEach((n) => n.remove());
    C.chev = [];
    if (corridorMode) {
      const cs = buildCorridors(dataset, renderIds, { cutoff, includeUndated: showUndated && atEnd });
      const maxCount = cs.reduce((m, c) => Math.max(m, c.count), 1);
      cs.forEach((c, ci) => {
        const full = arcPts([c.from.lat, c.from.lng], [c.to.lat, c.to.lng], 0.14);
        const w = 1.6 + (c.count / maxCount) * 8;
        const ln = L.polyline(full, { className: "mig-corridor", weight: Math.max(1.4, w * 0.5), opacity: 0.3, interactive: true }).addTo(group);
        ln.bindTooltip(
          `<b>${c.count} ${c.count === 1 ? "person" : "people"}</b><br>${c.from.place} → ${c.to.place}<br><span class="mig-tip-hint">click to see who</span>`,
          { sticky: true, className: "mig-tip" },
        );
        ln.on("click", (e: LT.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          setFocus({ corridor: { from: c.from.place, to: c.to.place, people: c.people.slice(), voyage: c.voyage } });
        });
        C.corr.push(ln);
        const pathEl = ln.getElement() as SVGPathElement | null;
        if (pathEl && pathEl.parentNode) {
          const NS = "http://www.w3.org/2000/svg";
          const pid = `mig-corr-${ci}`;
          pathEl.setAttribute("id", pid);
          const fs = Math.max(11, Math.min(22, 9 + w));
          const gap = Math.round(fs * 1.5);
          const text = document.createElementNS(NS, "text");
          text.setAttribute("class", "mig-corr-chev");
          text.setAttribute("font-size", String(fs));
          const tp = document.createElementNS(NS, "textPath");
          tp.setAttribute("href", `#${pid}`);
          tp.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${pid}`);
          tp.setAttribute("startOffset", "0");
          tp.setAttribute("letter-spacing", String(gap));
          tp.textContent = "➤".repeat(120);
          const anim = document.createElementNS(NS, "animate");
          anim.setAttribute("attributeName", "startOffset");
          anim.setAttribute("from", "0");
          anim.setAttribute("to", String(fs + gap));
          anim.setAttribute("dur", "1.4s");
          anim.setAttribute("repeatCount", "indefinite");
          tp.appendChild(anim);
          text.appendChild(tp);
          pathEl.parentNode.appendChild(text);
          C.chev.push(text);
        }
      });
    }

    if (playing && !corridorMode) {
      C.nodes.forEach((l, k) => {
        if (!seenN.has(k)) {
          group.removeLayer(l);
          C.nodes.delete(k);
        }
      });
    } else {
      // ── cluster overlapping pins by screen proximity, segmented by lineage ──
      C.nodes.forEach((l) => group.removeLayer(l));
      C.nodes.clear();
      C.clusters.forEach((l) => group.removeLayer(l));
      C.clusters = [];
      visNodes.forEach((v) => (v.pt = map.latLngToLayerPoint([v.lat, v.lng])));
      const R = 26;
      const groups: { pt: LT.Point; members: VisNode[] }[] = [];
      for (const v of visNodes) {
        let best = R;
        let chosen: { pt: LT.Point; members: VisNode[] } | null = null;
        for (const g of groups) {
          const d = Math.hypot(g.pt.x - v.pt!.x, g.pt.y - v.pt!.y);
          if (d < best) {
            best = d;
            chosen = g;
          }
        }
        if (chosen) chosen.members.push(v);
        else groups.push({ pt: v.pt!, members: [v] });
      }
      for (const g of groups) {
        const ms = g.members;
        if (ms.length === 1) {
          C.clusters.push(singlePin(ms[0], 1, 1));
          continue;
        }
        const persons: Record<string, ClusterPerson> = {};
        for (const v of ms) {
          (persons[v.id] ??= { id: v.id, cls: v.cls, col: v.col, nodes: [] }).nodes.push(v.node);
        }
        const pids = Object.keys(persons);
        if (pids.length === 1) {
          C.clusters.push(singlePin(ms.find((v) => v.kind === "birth") ?? ms[0], 1, 1));
          continue;
        }
        const total = pids.length;
        const clsColor: Record<string, string> = {};
        ms.forEach((v) => (clsColor[v.cls] = v.col));
        const byLine: Record<string, number> = {};
        pids.forEach((id) => {
          const c = persons[id].cls;
          byLine[c] = (byLine[c] || 0) + 1;
        });
        const clsLabel: Record<string, string> = {};
        pids.forEach((id) => (clsLabel[persons[id].cls] = people[id].surname));
        const keys = Object.keys(byLine);
        let acc = 0;
        const segs = keys.map((k) => {
          const f = byLine[k] / total;
          const s = `${clsColor[k]} ${(acc * 100).toFixed(1)}% ${((acc + f) * 100).toFixed(1)}%`;
          acc += f;
          return s;
        });
        const ring = keys.length === 1 ? clsColor[keys[0]] : `conic-gradient(${segs.join(",")})`;
        const size = Math.min(46, 28 + (total - 2) * 2);
        const core = size - 12;
        const anyActive = ms.some((v) => v.isActive);
        const allDim = !!activeId && !anyActive;
        const cw = ["mig-cluster", anyActive ? "mig-active" : "", allDim ? "mig-dim" : "", keys.length > 1 ? "mig-cluster-multi" : ""].join(" ");
        const html =
          `<div class="${cw}" style="width:${size}px;height:${size}px">` +
          `<span class="mig-cluster-ring" style="background:${ring}"></span>` +
          `<span class="mig-cluster-core" style="width:${core}px;height:${core}px;font-size:${total > 9 ? 11 : 12}px">${total}</span></div>`;
        const icon = L.divIcon({ className: "mig-cluster-wrap", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
        const clat = ms.reduce((s, v) => s + v.lat, 0) / ms.length;
        const clng = ms.reduce((s, v) => s + v.lng, 0) / ms.length;
        const m = L.marker([clat, clng], { icon, riseOnHover: true, zIndexOffset: anyActive ? 1200 : 600 }).addTo(group);
        const bd = keys.map((k) => `${clsLabel[k]} ${byLine[k]}`).join(" · ");
        const spread = ms.some((v) => v.lat !== ms[0].lat || v.lng !== ms[0].lng);
        m.bindTooltip(
          `<b>${total} people here</b><br>${bd}<br><span class="mig-tip-hint">${spread ? "click to zoom in" : "click for details"}</span>`,
          { direction: "top", className: "mig-tip", offset: [0, -size / 2] },
        );
        m.on("click", (e: LT.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          const pts = ms.map((v) => L.latLng(v.lat, v.lng));
          const b = L.latLngBounds(pts);
          const canZoom = map.getZoom() < map.getMaxZoom() && !b.getNorthEast().equals(b.getSouthWest());
          if (canZoom) map.fitBounds(b.pad(0.6), { maxZoom: Math.min(map.getMaxZoom(), map.getZoom() + 4) });
          else setFocus({ cluster: { persons: pids.map((id) => persons[id]) } });
        });
        C.clusters.push(m);
      }
    }

    C.edges.forEach((l, k) => {
      if (!seenE.has(k)) {
        group.removeLayer(l);
        C.edges.delete(k);
      }
    });
    C.arrows.forEach((l, k) => {
      if (!seenA.has(k)) {
        group.removeLayer(l);
        C.arrows.delete(k);
      }
    });
  }, [dataset, people, renderIds, activeId, showUndated, year, ready, theme, atEnd, playing, zoom, corridorMode, span.max]);

  // fit bounds when the *set* of people changes (not on scrubbing)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const js: Journey[] = renderIds.map((id) => journeyOf(id, dataset, { includeUndated: showUndated }));
    const b = journeyBounds(js);
    if (b) map.fitBounds(b, { padding: [80, 80], maxZoom: 7, animate: true });
  }, [renderIds, ready, showUndated, dataset]);

  // play loop
  useEffect(() => {
    if (!playing) return;
    if (year >= span.max) setYear(span.min);
    const iv = setInterval(() => {
      setYear((y) => {
        const n = y + 0.7;
        if (n >= span.max) {
          setPlaying(false);
          return span.max;
        }
        return n;
      });
    }, 50);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const resetAll = () => {
    setLineage(defaultLineage);
    setPersonId(null);
    setShowUndated(false);
    setYear(span.max);
    setPlaying(false);
    setFocus(null);
  };
  const fitAll = () => {
    const js = renderIds.map((id) => journeyOf(id, dataset, { includeUndated: showUndated }));
    const b = journeyBounds(js);
    if (b) mapRef.current?.fitBounds(b, { padding: [80, 80], maxZoom: 7 });
  };

  // ── filter options ───────────────────────────────────────────────────────
  const lineageOpts = useMemo(() => {
    const total = Object.keys(people).length;
    return [{ value: "", label: "All lineages", description: `${total} people`, keywords: "everyone all" }].concat(
      buildLineages(dataset).map((l) => ({
        value: l.key,
        label: l.label,
        description: `${l.count} ${l.count === 1 ? "person" : "people"}`,
        keywords: l.label,
        leading: <span className="mig-swatch" style={{ background: l.color }} />,
      })) as never[],
    );
  }, [dataset, people]);
  const peopleOpts = useMemo(
    () =>
      Object.values(people)
        .sort((a, b) => (a.born ?? 0) - (b.born ?? 0))
        .map((p) => ({
          value: p.id,
          label: `${firstGiven(p.given)} ${p.surname}`,
          description: lifeDates(p),
          keywords: `${p.maiden || ""} ${p.surname}`,
          leading: <Avatar name={fullName(p)} size="sm" />,
        })),
    [people],
  );

  const filterControls = (stacked: boolean) => (
    <>
      <Combobox
        label={stacked ? "Lineage" : undefined}
        aria-label="Filter by lineage"
        placeholder="All lineages"
        emptyMessage="No lineage by that name"
        value={lineage}
        onChange={(v) => setLineage(v || "")}
        options={lineageOpts}
        panelWidth={236}
      />
      <Combobox
        label={stacked ? "Isolate a person" : undefined}
        aria-label="Isolate one person's path"
        placeholder="Isolate a person…"
        emptyMessage="No one by that name"
        value={personId}
        onChange={(v) => setPersonId(v)}
        options={peopleOpts}
        panelWidth={252}
      />
    </>
  );

  const peekOpen = !!focus;

  return (
    <div
      className={"mig-root" + (placing ? " mig-placing" : "") + (peekOpen ? " mig-peekopen" : "")}
      style={{ position: "absolute", inset: 0 }}
    >
      <div ref={elRef} className="mig-map" />

      {/* title (top-left) */}
      <div className="mig-tl" style={{ zIndex: 500 }}>
        <div className="fa-float app-canvas-title" style={{ padding: "12px 16px" }}>
          <div className="app-display" style={{ fontSize: "var(--text-headline)" }}>
            Where the family lived
          </div>
          <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
            {renderIds.length} {renderIds.length === 1 ? "person" : "people"}
            {corridorMode ? " · flows aggregated by corridor" : " · arrows follow time, oldest → newest"}
          </div>
        </div>
        {unmapped.length > 0 && (
          <button className="fa-float mig-unmapped-btn" onClick={() => setUnmappedOpen(true)}>
            <span style={{ color: "var(--color-warning)", display: "inline-flex" }}>
              <Icon name="pin" size={15} />
            </span>
            <span>
              {unmapped.length} place{unmapped.length === 1 ? "" : "s"} to locate
            </span>
          </button>
        )}
        {corridorMode && (
          <div className="fa-float mig-corridorhint">
            <span className="mig-leg-arrows">{"➤➤➤"}</span>
            <span className="app-muted" style={{ fontSize: "var(--text-body-sm)" }}>
              Arrows flow toward where the family moved
            </span>
          </div>
        )}
      </div>

      {/* filter bar (top-right) */}
      <div className="mig-filters fa-float" style={{ zIndex: 520, right: peekOpen && !narrow ? 392 : 16 }}>
        {narrow ? (
          <button className="mig-filterstoggle" onClick={() => setFiltersOpen((o) => !o)}>
            <Icon name="search" size={15} /> <span>Filters{filtersActive ? " · on" : ""}</span>
          </button>
        ) : (
          <>
            {filterControls(false)}
            {filtersActive && (
              <button className="app-link" style={{ fontSize: "var(--text-body-sm)" }} onClick={resetAll}>
                Reset
              </button>
            )}
          </>
        )}
        {narrow && filtersOpen && (
          <div className="fa-float mig-filterspop">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
              <span className="app-label">Filter the map</span>
              <IconButton aria-label="Close" onClick={() => setFiltersOpen(false)}>
                <Icon name="close" size={16} />
              </IconButton>
            </div>
            <div style={{ display: "grid", gap: "var(--space-md)" }}>{filterControls(true)}</div>
            {filtersActive && (
              <button
                className="app-link"
                style={{ fontSize: "var(--text-body-sm)", marginTop: "var(--space-md)" }}
                onClick={() => {
                  resetAll();
                  setFiltersOpen(false);
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* map controls (bottom-right; shift left when the peek is open) */}
      <div
        className="fa-float app-zoomctl"
        style={{ position: "absolute", padding: 4, zIndex: 500, display: "flex", flexDirection: "column", gap: 3, bottom: 16, right: peekOpen && !narrow ? 392 : 16 }}
      >
        <IconButton aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Icon name="zoomIn" />
        </IconButton>
        <IconButton aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Icon name="zoomOut" />
        </IconButton>
        <IconButton aria-label="Fit all" onClick={fitAll}>
          <Icon name="fit" />
        </IconButton>
      </div>

      {/* legend + undated toggle (bottom-left) */}
      <div className="fa-float mig-legend" style={{ zIndex: 500 }}>
        <span className="mig-leg">
          <span className="mig-leg-m mig-leg-born" />
          Born
        </span>
        <span className="mig-leg">
          <span className="mig-leg-m mig-leg-lived" />
          Lived
        </span>
        <span className="mig-leg">
          <span className="mig-leg-m mig-leg-died" />
          Died
        </span>
        {corridorMode ? (
          <span className="mig-leg">
            <span className="mig-leg-arrows">{"➤➤➤"}</span>
            Corridor &middot; width = people
          </span>
        ) : (
          <span className="mig-leg">
            <span className="mig-leg-pathsym" />
            Migration path
          </span>
        )}
        <label className="mig-leg mig-undated">
          <Switch checked={showUndated} onChange={setShowUndated} disabled={!atEnd} />
          <span>Show undated places</span>
        </label>
      </div>

      {/* time scrubber (bottom-centre; shift left of the peek when open) */}
      <div className="fa-float mig-time" style={{ zIndex: 500, left: peekOpen && !narrow ? "calc(50% - 190px)" : "50%" }}>
        <IconButton aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5l12 7-12 7z" />
            </svg>
          )}
        </IconButton>
        <div className="mig-time-yr">{atEnd ? "All years" : `as of ${Math.round(year)}`}</div>
        <Slider
          aria-label="Year"
          min={span.min}
          max={span.max}
          step={1}
          value={year}
          onChange={(v) => {
            setPlaying(false);
            setYear(v);
          }}
        />
      </div>

      {/* pin-drop banner */}
      {placing && (
        <div className="fa-float mig-placebar" style={{ zIndex: 700 }}>
          <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
            <Icon name="pin" size={16} />
          </span>
          <span>
            Click the map to place <b style={{ fontFamily: "var(--font-serif)" }}>{placing}</b>
          </span>
          <button className="app-link" onClick={() => setPlacing(null)}>
            Cancel
          </button>
        </div>
      )}

      {unmappedOpen && (
        <UnmappedPanel
          unmapped={unmapped}
          onClose={() => setUnmappedOpen(false)}
          placing={placing}
          onPlace={(ps) => {
            setPlacing(ps);
            setUnmappedOpen(false);
          }}
          onOpen={onOpen}
        />
      )}

      {focus && (
        <MapPeek
          focus={focus}
          onClose={() => setFocus(null)}
          onOpen={onOpen}
          onIsolate={(id) => {
            setPersonId(id);
            setFocus(null);
          }}
          onPick={(pid, node) => setFocus({ personId: pid, node })}
        />
      )}
    </div>
  );
}

// ── places-to-locate panel ────────────────────────────────────────────────────
function UnmappedPanel({
  unmapped,
  onClose,
  onPlace,
  placing,
  onOpen,
}: {
  unmapped: UnmappedPlace[];
  onClose: () => void;
  onPlace: (ps: string) => void;
  placing: string | null;
  onOpen: (id: string) => void;
}) {
  const { people } = useDataset();
  return (
    <div className="app-peek app-peek--left app-scroll" style={{ zIndex: 650 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="app-label">Places to locate</span>
        <IconButton aria-label="Close" onClick={onClose}>
          <Icon name="close" size={16} />
        </IconButton>
      </div>
      <div style={{ marginTop: "var(--space-md)" }}>
        <div className="app-display" style={{ fontSize: "var(--text-headline)" }}>
          {unmapped.length} place{unmapped.length === 1 ? "" : "s"} off the map
        </div>
        <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
          These places appear in records but couldn&rsquo;t be located automatically. Drop a pin so their stops show on the map — nothing is hidden.
        </div>
      </div>
      {unmapped.length === 0 ? (
        <div style={{ marginTop: "var(--space-xl)" }}>
          <EmptyState title="Everything is on the map" description="Every recorded place resolved to a location." />
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-sm)", marginTop: "var(--space-lg)" }}>
          {unmapped.map((u) => {
            const names = u.people.map((id) => people[id]).filter(Boolean);
            return (
              <div key={u.place} className="mig-unmapped-row">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-sm)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="mig-unmapped-place">{u.place}</div>
                    <div className="app-muted" style={{ fontSize: "var(--text-label)" }}>
                      {u.events.length} record{u.events.length === 1 ? "" : "s"} · {names.map((p) => firstGiven(p.given)).join(", ")}
                    </div>
                  </div>
                  <button className="mig-placebtn" onClick={() => onPlace(u.place)} disabled={placing === u.place}>
                    <Icon name="pin" size={14} />
                    {placing === u.place ? "Placing…" : "Place"}
                  </button>
                </div>
                <div style={{ display: "flex", marginTop: 8 }}>
                  {names.slice(0, 5).map((p, i) => (
                    <span
                      key={p.id}
                      style={{ marginLeft: i ? -8 : 0, outline: "2px solid var(--color-bg)", borderRadius: "50%", cursor: "pointer" }}
                      onClick={() => onOpen(p.id)}
                    >
                      <Avatar name={fullName(p)} size="sm" />
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── cluster breakdown panel ───────────────────────────────────────────────────
function ClusterPeek({
  persons,
  onClose,
  onPick,
}: {
  persons: ClusterPerson[];
  onClose: () => void;
  onPick: (id: string, node: MapNode) => void;
}) {
  const dataset = useDataset();
  const { people } = dataset;
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(20);
  const [allPlaces, setAllPlaces] = useState(false);

  const places: string[] = [];
  persons.forEach((pp) => pp.nodes.forEach((n) => !places.includes(n.place) && places.push(n.place)));
  const byLine: Record<string, number> = {};
  persons.forEach((pp) => (byLine[pp.cls] = (byLine[pp.cls] || 0) + 1));
  const clsColor: Record<string, string> = {};
  persons.forEach((pp) => (clsColor[pp.cls] = pp.col || lineColorOf(dataset, pp.id)));
  const clsLabel: Record<string, string> = {};
  persons.forEach((pp) => (clsLabel[pp.cls] = people[pp.id].surname));
  const lineKeys = Object.keys(byLine);

  const sorted = persons.slice().sort((a, b) => (people[a.id].born ?? 0) - (people[b.id].born ?? 0));
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? sorted.filter((pp) => {
        const p = people[pp.id];
        const plc = pp.nodes.map((n) => n.place).join(" ");
        return `${fullName(p)} ${p.maiden || ""} ${plc}`.toLowerCase().includes(ql);
      })
    : sorted;
  const shown = filtered.slice(0, limit);
  const placeCap = 4;

  return (
    <div className="app-peek app-scroll" style={{ zIndex: 600 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="app-label">People in this area</span>
        <IconButton aria-label="Close" onClick={onClose}>
          <Icon name="close" size={16} />
        </IconButton>
      </div>
      <div style={{ marginTop: "var(--space-md)" }}>
        <div className="app-display" style={{ fontSize: "var(--text-headline)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
            <Icon name="pin" size={20} />
          </span>
          <span>{persons.length} people here</span>
        </div>
        <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
          {(allPlaces ? places : places.slice(0, placeCap)).join(" · ")}
          {places.length > placeCap && (
            <button className="app-link" style={{ marginLeft: 6, fontSize: "var(--text-label)" }} onClick={() => setAllPlaces((v) => !v)}>
              {allPlaces ? "show less" : `+${places.length - placeCap} more`}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "var(--space-lg) 0 var(--space-md)" }}>
        {lineKeys.slice(0, 4).map((k) => (
          <span key={k} className="app-typechip" style={{ cursor: "default", ["--ln" as string]: clsColor[k] }}>
            <span className="app-typedot mig-linedot" />
            {clsLabel[k] || k} {byLine[k]}
          </span>
        ))}
        {lineKeys.length > 4 && <span className="app-typechip">+{lineKeys.length - 4} more</span>}
      </div>
      {persons.length > 8 && (
        <div style={{ marginBottom: "var(--space-md)" }}>
          <Input
            placeholder="Search people or places…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(20);
            }}
          />
        </div>
      )}
      <div style={{ display: "grid", gap: "var(--space-sm)" }}>
        {shown.map((pp) => {
          const p = people[pp.id];
          const yrs = pp.nodes.map((n) => n.firstYear).filter((y): y is number => y != null);
          const yspan = yrs.length ? (Math.min(...yrs) === Math.max(...yrs) ? Math.min(...yrs) : `${Math.min(...yrs)}–${Math.max(...yrs)}`) : "date unknown";
          const plc: string[] = [];
          pp.nodes.forEach((n) => !plc.includes(n.place) && plc.push(n.place));
          const rep = pp.nodes.find((n) => n.kind === "birth") || pp.nodes[0];
          return (
            <button key={pp.id} type="button" className="app-mininode" onClick={() => onPick(pp.id, rep)}>
              <span className="mig-rowdot" style={{ ["--ln" as string]: lineColorOf(dataset, pp.id) }} />
              <Avatar name={fullName(p)} size="sm" />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="nm" style={{ display: "block" }}>
                  {firstGiven(p.given)} {p.surname}
                </span>
                <span className="dt" style={{ display: "block" }}>
                  {plc.join(", ")} · {yspan}
                </span>
              </span>
            </button>
          );
        })}
        {!shown.length && (
          <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", padding: "var(--space-md) 0" }}>
            No one matches “{q}”.
          </div>
        )}
      </div>
      {filtered.length > limit && (
        <button className="app-link" style={{ marginTop: "var(--space-md)", fontSize: "var(--text-body-sm)" }} onClick={() => setLimit((n) => n + 30)}>
          Show {Math.min(30, filtered.length - limit)} more ({filtered.length - limit} left)
        </button>
      )}
    </div>
  );
}

// ── corridor breakdown ────────────────────────────────────────────────────────
function CorridorPeek({
  corridor,
  onClose,
  onIsolate,
}: {
  corridor: { from: string; to: string; people: string[]; voyage: boolean };
  onClose: () => void;
  onIsolate: (id: string) => void;
}) {
  const dataset = useDataset();
  const { people } = dataset;
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(20);

  const list = corridor.people
    .map((id) => people[id])
    .filter(Boolean)
    .sort((a, b) => (a.born ?? 0) - (b.born ?? 0));
  const ql = q.trim().toLowerCase();
  const filtered = ql ? list.filter((p) => `${fullName(p)} ${p.maiden || ""}`.toLowerCase().includes(ql)) : list;
  const shown = filtered.slice(0, limit);

  return (
    <div className="app-peek app-scroll" style={{ zIndex: 600 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="app-label">{corridor.voyage ? "Voyage" : "Migration"} corridor</span>
        <IconButton aria-label="Close" onClick={onClose}>
          <Icon name="close" size={16} />
        </IconButton>
      </div>
      <div style={{ marginTop: "var(--space-md)" }}>
        <div className="app-display" style={{ fontSize: "var(--text-headline)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
            <Icon name="pin" size={20} />
          </span>
          <span>
            {list.length} {list.length === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
          {corridor.from} &rarr; {corridor.to}
        </div>
      </div>
      {list.length > 8 && (
        <div style={{ margin: "var(--space-lg) 0 var(--space-md)" }}>
          <Input
            placeholder="Search people…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(20);
            }}
          />
        </div>
      )}
      <div style={{ display: "grid", gap: "var(--space-sm)", marginTop: list.length > 8 ? 0 : "var(--space-lg)" }}>
        {shown.map((p) => (
          <button key={p.id} type="button" className="app-mininode" onClick={() => onIsolate(p.id)}>
            <span className="mig-rowdot" style={{ ["--ln" as string]: lineColorOf(dataset, p.id) }} />
            <Avatar name={fullName(p)} size="sm" />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="nm" style={{ display: "block" }}>
                {firstGiven(p.given)} {p.surname}
              </span>
              <span className="dt" style={{ display: "block" }}>
                {lifeDates(p)}
              </span>
            </span>
            <span style={{ color: "var(--color-muted)", display: "inline-flex" }}>
              <Icon name="chevron" size={16} />
            </span>
          </button>
        ))}
        {!shown.length && (
          <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", padding: "var(--space-md) 0" }}>
            No one matches “{q}”.
          </div>
        )}
      </div>
      {filtered.length > limit && (
        <button className="app-link" style={{ marginTop: "var(--space-md)", fontSize: "var(--text-body-sm)" }} onClick={() => setLimit((n) => n + 30)}>
          Show {Math.min(30, filtered.length - limit)} more ({filtered.length - limit} left)
        </button>
      )}
      <div className="app-muted" style={{ fontSize: "var(--text-label)", marginTop: "var(--space-lg)" }}>
        Select anyone to trace just their path.
      </div>
    </div>
  );
}

// ── focused place / person panel ──────────────────────────────────────────────
function MapPeek({
  focus,
  onClose,
  onOpen,
  onIsolate,
  onPick,
}: {
  focus: Focus;
  onClose: () => void;
  onOpen: (id: string) => void;
  onIsolate: (id: string) => void;
  onPick: (id: string, node: MapNode) => void;
}) {
  const { people } = useDataset();
  if ("cluster" in focus) return <ClusterPeek persons={focus.cluster.persons} onClose={onClose} onPick={onPick} />;
  if ("corridor" in focus) return <CorridorPeek corridor={focus.corridor} onClose={onClose} onIsolate={onIsolate} />;
  const p = people[focus.personId];
  const n = focus.node;
  const yr = !n.dated ? "Date unknown" : n.firstYear === n.lastYear ? String(n.firstYear) : `${n.firstYear}–${n.lastYear}`;

  return (
    <div className="app-peek app-scroll" style={{ zIndex: 600 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="app-label">Place on this path</span>
        <IconButton aria-label="Close" onClick={onClose}>
          <Icon name="close" size={16} />
        </IconButton>
      </div>
      <div style={{ marginTop: "var(--space-md)" }}>
        <div className="app-display" style={{ fontSize: "var(--text-headline)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
            <Icon name="pin" size={20} />
          </span>
          {nodeLabel(n)}
        </div>
        <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 2, fontFeatureSettings: '"tnum" 1' }}>
          {yr}
        </div>
      </div>

      <button type="button" className="app-mininode" style={{ marginTop: "var(--space-lg)" }} onClick={() => onOpen(focus.personId)}>
        <Avatar name={fullName(p)} size="sm" />
        <span style={{ minWidth: 0 }}>
          <span className="nm" style={{ display: "block" }}>
            {firstGiven(p.given)} {p.surname}
          </span>
          <span className="dt" style={{ display: "block" }}>
            {lifeDates(p)}
          </span>
        </span>
      </button>

      <div className="app-label" style={{ margin: "var(--space-lg) 0 var(--space-sm)" }}>
        What happened here
      </div>
      <div style={{ display: "grid", gap: 2 }}>
        {n.events.map((ev) => {
          const m = EVENT_META[ev.type] ?? EVENT_META.other;
          return (
            <div key={ev.id} className="app-peekev">
              <IconBadge icon={<Icon name={m.icon as IconName} size={15} />} color={m.color} title={m.label} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="app-peekev-t">{ev.title}</div>
                <div className="app-muted" style={{ fontSize: "var(--text-label)", fontFeatureSettings: '"tnum" 1' }}>
                  {ev.date ? fmtDate(ev) : "Undated"}
                </div>
              </div>
              <ProvenanceMark status={ev.prov} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-xl)" }}>
        <Button variant="primary" fullWidth onClick={() => onOpen(focus.personId)}>
          View full record
        </Button>
        <Button variant="secondary" onClick={() => onIsolate(focus.personId)}>
          Isolate path
        </Button>
      </div>
    </div>
  );
}

// Keep the Dataset type referenced (used via useDataset()'s return).
export type { Dataset };
