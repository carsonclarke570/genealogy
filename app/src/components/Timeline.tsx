"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  DocChip,
  EmptyState,
  IconBadge,
  MultiSelect,
  ProvenanceMark,
  SegmentedControl,
  Timeline as TimelineRail,
  TimelineItem,
  Tooltip,
} from "@family-archive/ui";
import type { DocType } from "@family-archive/ui";
import { fullName, lifeDates, shortName, type Person, type TimelineEvent } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import {
  EVENT_META,
  TIMELINE_TYPE_ORDER,
  decadeOf,
  eventsOf,
  fmtDate,
  meta,
  yearOf,
  yearSpan,
} from "@/lib/timeline";
import { Icon, type IconName } from "./Icon";
import { AddEventDialog } from "./AddEventDialog";
import type { Screen } from "./AppShell";

type Layout = "river" | "lanes" | "decades";

const DOC_LABEL: Record<DocType, string> = {
  photo: "Photo",
  certificate: "Certificate",
  article: "Article",
  obituary: "Obituary",
  other: "Document",
};

/** A document event is tinted by its doc-type; everything else by its event type. */
function eventColor(e: TimelineEvent): string {
  if (e.type === "document" && e.source) return `var(--doc-${e.source.type})`;
  return meta(e.type).color;
}
function eventCategory(e: TimelineEvent): string {
  if (e.type === "document" && e.source) return DOC_LABEL[e.source.type];
  return meta(e.type).label;
}

/** One event in a vertical rail — DS TimelineItem with place, people, and source. */
function EventRow({
  ev,
  contextId,
  onOpen,
  onOpenDoc,
  onEdit,
  last,
}: {
  ev: TimelineEvent;
  contextId?: string;
  onOpen?: (id: string) => void;
  onOpenDoc?: () => void;
  /** Edit a stored event. Only offered for non-derived (`auto: false`) events. */
  onEdit?: (ev: TimelineEvent) => void;
  last?: boolean;
}) {
  const { people } = useDataset();
  const m = meta(ev.type);
  const color = eventColor(ev);
  const others = ev.people.filter((id) => id !== contextId && people[id]);

  return (
    <TimelineItem
      last={last}
      icon={<IconBadge icon={<Icon name={m.icon as IconName} />} color={color} title={m.label} />}
      date={fmtDate(ev)}
      category={eventCategory(ev)}
      categoryColor={color}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          {ev.title}
          <ProvenanceMark status={ev.prov} source={ev.prov === "verified" ? ev.source?.title : undefined} size={13} />
        </span>
      }
      meta={
        <>
          {ev.place && (
            <span className="app-evplace">
              <Icon name="pin" size={13} />
              {ev.place}
            </span>
          )}
          {others.length > 0 && (
            <span className="app-evwith">
              <span className="app-avstack">
                {others.slice(0, 3).map((id, i) => (
                  <Tooltip key={id} label={fullName(people[id])}>
                    <span
                      style={{ marginLeft: i ? -7 : 0, display: "inline-flex", borderRadius: "50%", outline: "2px solid var(--color-surface)", cursor: "pointer" }}
                      onClick={() => onOpen?.(id)}
                    >
                      <Avatar name={fullName(people[id])} size="sm" />
                    </span>
                  </Tooltip>
                ))}
              </span>
              <span className="app-muted">
                {contextId ? "with " : ""}
                {others.map((id) => people[id].given.split(" ")[0]).join(", ")}
              </span>
            </span>
          )}
          {ev.source && (
            <button type="button" className="app-evsource" style={{ marginLeft: "auto" }} onClick={onOpenDoc} title={`Source · ${ev.source.title}`}>
              <DocChip type={ev.source.type}>{ev.source.title}</DocChip>
            </button>
          )}
          {!ev.auto && onEdit && (
            <button
              type="button"
              className="app-link"
              style={{ marginLeft: ev.source ? "var(--space-sm)" : "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-body-sm)" }}
              onClick={() => onEdit(ev)}
              title="Edit this event"
            >
              <Icon name="edit" size={14} />
              Edit
            </button>
          )}
          {ev.nested && ev.nested.length > 0 && (
            <span style={{ flexBasis: "100%", display: "grid", gap: 2, marginTop: 2 }}>
              {ev.nested.map((n) => (
                <span
                  key={n.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--text-body-sm)", color: "var(--color-muted)" }}
                >
                  <Icon name="edit" size={12} />
                  {n.title}
                  <ProvenanceMark status={n.prov} source={n.prov === "verified" ? n.source?.title : undefined} size={12} />
                </span>
              ))}
            </span>
          )}
        </>
      }
    />
  );
}

// ── River: one chronological column with year dividers ──────────────────────
function RiverView({ events, onOpen, onOpenDoc, onEdit }: { events: TimelineEvent[]; onOpen: (id: string) => void; onOpenDoc: () => void; onEdit?: (ev: TimelineEvent) => void }) {
  const rows: React.ReactNode[] = [];
  let lastYear: number | null = null;
  events.forEach((ev, i) => {
    const y = yearOf(ev);
    if (y !== lastYear) {
      rows.push(
        <div key={`y-${y}-${i}`} className="app-yeardiv">
          <span>{y ?? "—"}</span>
        </div>,
      );
      lastYear = y;
    }
    rows.push(<EventRow key={ev.id} ev={ev} onOpen={onOpen} onOpenDoc={onOpenDoc} onEdit={onEdit} last={i === events.length - 1} />);
  });
  return <div className="app-timeline app-timeline-river">{rows}</div>;
}

// ── Decades: grouped sections ───────────────────────────────────────────────
function DecadesView({ events, onOpen, onOpenDoc, onEdit }: { events: TimelineEvent[]; onOpen: (id: string) => void; onOpenDoc: () => void; onEdit?: (ev: TimelineEvent) => void }) {
  const groups = new Map<number, TimelineEvent[]>();
  for (const e of events) {
    const d = decadeOf(e);
    if (d == null) continue;
    (groups.get(d) ?? groups.set(d, []).get(d)!).push(e);
  }
  const decades = [...groups.keys()].sort((a, b) => a - b);
  return (
    <div style={{ display: "grid", gap: "var(--space-2xl)" }}>
      {decades.map((d) => {
        const list = groups.get(d)!;
        return (
          <section key={d}>
            <div className="app-decadehead">
              <span className="app-display" style={{ fontSize: "var(--text-headline)" }}>{d}s</span>
              <span className="app-muted" style={{ fontSize: "var(--text-body-sm)" }}>
                {list.length} {list.length === 1 ? "event" : "events"}
              </span>
              <span className="app-decaderule" />
            </div>
            <div className="app-timeline">
              {list.map((ev, i) => (
                <EventRow key={ev.id} ev={ev} onOpen={onOpen} onOpenDoc={onOpenDoc} onEdit={onEdit} last={i === list.length - 1} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Lanes: one row per person, time on the x-axis ───────────────────────────
function LanesView({
  events,
  people: selected,
  from,
  to,
  onOpen,
}: {
  events: TimelineEvent[];
  people: string[];
  from: number;
  to: number;
  onOpen: (id: string) => void;
}) {
  const { people } = useDataset();
  const nowYear = new Date().getFullYear();

  let ids = selected.slice();
  if (!ids.length) {
    const seen = new Set<string>();
    for (const e of events) for (const id of e.people) if (people[id]) seen.add(id);
    ids = [...seen];
  }
  ids.sort((a, b) => (people[a]?.born ?? 0) - (people[b]?.born ?? 0));

  const minY = from;
  const maxY = to + 9;
  const span = Math.max(1, maxY - minY);
  const x = (year: number) => ((year - minY) / span) * 100;
  const ticks: number[] = [];
  for (let d = Math.ceil(minY / 10) * 10; d <= maxY; d += 10) ticks.push(d);
  const stepPct = `${(10 / span) * 100}%`;
  const TRACK_MIN = 720;

  return (
    <div className="app-lanes-scroll">
      <div className="app-lanes" style={{ minWidth: 170 + TRACK_MIN }}>
        <div className="app-lane app-lane-axis">
          <div className="app-lane-name app-muted" style={{ fontSize: "var(--text-label)" }}>Decade →</div>
          <div className="app-lane-track" style={{ minWidth: TRACK_MIN, ["--step" as string]: stepPct }}>
            {ticks.map((t) => (
              <div key={t} className="app-tick" style={{ left: `${x(t)}%` }}>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {ids.map((id) => {
          const p = people[id];
          if (!p) return null;
          const evs = events.filter((e) => e.people.includes(id));
          const bornX = x(Math.max(minY, p.born ?? minY));
          const endY = p.living ? Math.min(maxY, nowYear) : p.died ?? maxY;
          const endX = x(Math.min(maxY, endY));
          return (
            <div key={id} className="app-lane">
              <button className="app-lane-name app-lane-namebtn" onClick={() => onOpen(id)}>
                <Avatar name={fullName(p)} size="sm" />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: "var(--text-body-sm)", color: "var(--color-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {shortName(p)}
                  </span>
                  <span className="app-muted tnum" style={{ fontSize: "var(--text-label)" }}>{lifeDates(p)}</span>
                </span>
              </button>
              <div className="app-lane-track" style={{ minWidth: TRACK_MIN, ["--step" as string]: stepPct }}>
                <span className="app-lifebar" style={{ left: `${bornX}%`, width: `${Math.max(0, endX - bornX)}%` }} />
                {evs.map((ev) => {
                  const y = yearOf(ev);
                  if (y == null) return null;
                  return (
                    <span key={ev.id} className="app-lanedot-wrap" style={{ left: `${x(y)}%` }}>
                      <Tooltip label={`${fmtDate(ev)} · ${ev.title}`}>
                        <button
                          className="app-lanedot"
                          style={{ background: eventColor(ev) }}
                          onClick={() => onOpen(id)}
                          aria-label={ev.title}
                        />
                      </Tooltip>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Timeline({
  onOpen,
  onNavigate,
}: {
  onOpen: (id: string) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { people, events: allEvents } = useDataset();
  const [layout, setLayout] = useState<Layout>("river");
  const [dialog, setDialog] = useState(false);
  const [editEvent, setEditEvent] = useState<TimelineEvent | null>(null);

  // The Lanes view needs ~890px of horizontal room; on phones it degrades to a
  // sideways-scrolling sliver, so we drop it from the choices and fall back to
  // River there.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (narrow && layout === "lanes") setLayout("river");
  }, [narrow, layout]);

  const [span] = useMemo(() => [yearSpan(allEvents)] as const, [allEvents]);
  const decadeMin = Math.floor(span[0] / 10) * 10;
  const decadeMax = Math.ceil(span[1] / 10) * 10;
  const decades: number[] = [];
  for (let d = decadeMin; d <= decadeMax; d += 10) decades.push(d);

  const [types, setTypes] = useState<string[]>(() => TIMELINE_TYPE_ORDER.slice());
  const [persons, setPersons] = useState<string[]>([]);
  const [from, setFrom] = useState(decadeMin);
  const [to, setTo] = useState(decadeMax);

  const toggleType = (k: string) =>
    setTypes((s) => (s.includes(k) ? s.filter((x) => x !== k) : s.concat(k)));

  const filtered = useMemo(
    () =>
      allEvents.filter((e) => {
        if (!types.includes(e.type)) return false;
        const y = yearOf(e);
        if (y != null && (y < from || y > to + 9)) return false;
        if (persons.length && !e.people.some((id) => persons.includes(id))) return false;
        return true;
      }),
    [allEvents, types, persons, from, to],
  );

  const filtersActive =
    types.length !== TIMELINE_TYPE_ORDER.length || persons.length > 0 || from !== decadeMin || to !== decadeMax;
  const resetAll = () => {
    setTypes(TIMELINE_TYPE_ORDER.slice());
    setPersons([]);
    setFrom(decadeMin);
    setTo(decadeMax);
  };

  // Which types actually occur, so the legend only shows real ones.
  const presentTypes = useMemo(() => {
    const set = new Set(allEvents.map((e) => e.type));
    return TIMELINE_TYPE_ORDER.filter((k) => set.has(k));
  }, [allEvents]);

  const openDoc = () => onNavigate("gallery");

  return (
    <div className="app-scroll" style={{ height: "100%", overflow: "auto", padding: "var(--space-xl) var(--space-2xl) var(--space-4xl)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "var(--space-lg)", flexWrap: "wrap" }}>
          <div>
            <div className="app-display" style={{ fontSize: "var(--text-display)" }}>Family timeline</div>
            <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 4 }}>
              {filtered.length} of {allEvents.length} events · {span[0]}–{span[1]}
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
            <SegmentedControl
              aria-label="Timeline layout"
              value={layout}
              onValueChange={(k) => setLayout(k as Layout)}
              items={[
                { value: "river", label: "River", icon: <Icon name="clock" size={15} /> },
                ...(narrow
                  ? []
                  : [{ value: "lanes", label: "Lanes", icon: <Icon name="sliders" size={15} /> }]),
                { value: "decades", label: "Decades", icon: <Icon name="calendar" size={15} /> },
              ]}
            />
            <Button variant="primary" iconStart={<Icon name="plus" size={16} />} onClick={() => setDialog(true)}>
              Add event
            </Button>
          </div>
        </div>

        <div className="app-filterbar">
          <MultiSelect
            label="Filter by person"
            placeholder="Everyone"
            icon={<Icon name="tree" size={15} />}
            summary={(n) => `${n} selected`}
            selected={persons}
            onChange={setPersons}
            options={Object.values(people)
              .sort((a, b) => (a.born ?? 0) - (b.born ?? 0))
              .map((p) => ({
                value: p.id,
                label: shortName(p),
                description: lifeDates(p),
                leading: <Avatar name={fullName(p)} size="sm" />,
              }))}
          />
          <div className="app-period">
            <span className="app-muted" style={{ fontSize: "var(--text-body-sm)" }}>Period</span>
            <select
              className="app-periodsel"
              value={from}
              onChange={(e) => {
                const v = +e.target.value;
                setFrom(v);
                if (v > to) setTo(v);
              }}
            >
              {decades.map((d) => (
                <option key={d} value={d}>{d}s</option>
              ))}
            </select>
            <span className="app-muted">–</span>
            <select
              className="app-periodsel"
              value={to}
              onChange={(e) => {
                const v = +e.target.value;
                setTo(v);
                if (v < from) setFrom(v);
              }}
            >
              {decades.map((d) => (
                <option key={d} value={d}>{d}s</option>
              ))}
            </select>
          </div>
          {filtersActive && (
            <button className="app-link" style={{ fontSize: "var(--text-body-sm)" }} onClick={resetAll}>
              Reset
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", margin: "var(--space-md) 0 var(--space-xl)" }}>
          {presentTypes.map((k) => {
            const on = types.includes(k);
            const m = EVENT_META[k];
            return (
              <button
                key={k}
                className="app-typechip"
                onClick={() => toggleType(k)}
                style={{ opacity: on ? 1 : 0.4, borderColor: on ? "var(--color-border-strong)" : "var(--color-border)" }}
              >
                <span className="app-typedot" style={{ background: m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div style={{ marginTop: "var(--space-2xl)" }}>
            <EmptyState
              icon={<Icon name="calendar" size={26} />}
              title="No events in this view"
              description="Loosen the filters — widen the period, add people back, or re-enable event types."
              action={
                <Button variant="primary" onClick={resetAll}>
                  Reset filters
                </Button>
              }
            />
          </div>
        ) : layout === "river" ? (
          <RiverView events={filtered} onOpen={onOpen} onOpenDoc={openDoc} onEdit={setEditEvent} />
        ) : layout === "decades" ? (
          <DecadesView events={filtered} onOpen={onOpen} onOpenDoc={openDoc} onEdit={setEditEvent} />
        ) : (
          <LanesView events={filtered} people={persons} from={from} to={to} onOpen={onOpen} />
        )}
      </div>

      <AddEventDialog
        open={dialog || !!editEvent}
        editEvent={editEvent}
        onClose={() => {
          setDialog(false);
          setEditEvent(null);
        }}
      />
    </div>
  );
}

/**
 * Compact per-person timeline shown inside the Person record's Timeline tab:
 * chip filters by type + an Add-event button that pre-links this person.
 */
export function PersonTimeline({ id, onOpen, onNavigate }: { id: string; onOpen: (id: string) => void; onNavigate: (screen: Screen) => void }) {
  const { events: allEvents } = useDataset();
  const [filter, setFilter] = useState<string>("all");
  const [dialog, setDialog] = useState(false);
  const [editEvent, setEditEvent] = useState<TimelineEvent | null>(null);

  const events = useMemo(() => eventsOf(allEvents, id), [allEvents, id]);
  const present = useMemo(() => TIMELINE_TYPE_ORDER.filter((k) => events.some((e) => e.type === k)), [events]);
  const shown = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div style={{ paddingTop: "var(--space-lg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-lg)" }}>
        <button className="app-typechip" onClick={() => setFilter("all")} style={{ opacity: filter === "all" ? 1 : 0.5 }}>
          All ({events.length})
        </button>
        {present.map((k) => (
          <button key={k} className="app-typechip" onClick={() => setFilter(k)} style={{ opacity: filter === k ? 1 : 0.5 }}>
            <span className="app-typedot" style={{ background: EVENT_META[k].color }} />
            {EVENT_META[k].label}
          </button>
        ))}
        <span style={{ marginLeft: "auto" }}>
          <Button variant="primary" size="sm" iconStart={<Icon name="plus" size={16} />} onClick={() => setDialog(true)}>
            Add event
          </Button>
        </span>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Icon name="calendar" size={24} />} title="No life events recorded yet" description="Add an event, or record this person's dates to seed their birth and death." />
      ) : (
        <div className="app-timeline">
          {shown.map((ev, i) => (
            <EventRow key={ev.id} ev={ev} contextId={id} onOpen={onOpen} onOpenDoc={() => onNavigate("gallery")} onEdit={setEditEvent} last={i === shown.length - 1} />
          ))}
        </div>
      )}

      <AddEventDialog
        open={dialog || !!editEvent}
        editEvent={editEvent}
        presetPersonId={id}
        onClose={() => {
          setDialog(false);
          setEditEvent(null);
        }}
      />
    </div>
  );
}
