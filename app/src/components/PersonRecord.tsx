"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Chip,
  IconBadge,
  Menu,
  ProvenanceMark,
  Tabs,
} from "@family-archive/ui";
import type { ChipDot } from "@family-archive/ui";
import { formatPartialDate } from "@family-archive/ui";
import {
  fullName,
  lifeDates,
  docCount,
  provOf,
  provSourceOf,
  provSummary,
  relationsOf,
  NAME_REASON_LABEL,
  type Person,
  type Relation,
  type MediaItem,
} from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { eventsOf, fmtDate, meta } from "@/lib/timeline";
import { Icon, type IconName } from "./Icon";
import { PersonTimeline } from "./Timeline";
import { MiniNode, DocDot, MediaThumb, ClickableCard } from "./shared";
import { MediaUpload } from "./MediaUpload";
import { MediaDetail } from "./MediaDetail";
import type { Screen } from "./AppShell";

function bioParas(p: Person): string[] {
  const name = p.given.split(" ")[0];
  // Build each clause only from facts that are actually recorded, so a sparse
  // record never reads "born in null in null".
  const birthBits = [
    p.bornPlace ? `in ${p.bornPlace}` : null,
    p.born != null ? `in ${p.born}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const deathBits = [
    p.diedPlace ? `in ${p.diedPlace}` : null,
    p.died != null ? `in ${p.died}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  let first: string;
  if (birthBits && (p.living || deathBits)) {
    first = `${name} was born ${birthBits}, ${p.living ? "and is living" : `and died ${deathBits}`}.`;
  } else if (birthBits) {
    first = `${name} was born ${birthBits}.`;
  } else if (p.living) {
    first = `${name} is living.`;
  } else if (deathBits) {
    first = `${name} died ${deathBits}.`;
  } else {
    first = `${name}'s biographical details haven't been recorded yet.`;
  }
  const second = p.maiden
    ? `Recorded under the family name ${p.surname} (née ${p.maiden}), ${name} appears across several family photographs and certificates in the archive.`
    : `${name}'s record draws on the photographs, certificates and articles attached below.`;
  return [first, second];
}

function sourceFor(p: Person, field: string): string {
  if (field === "name") return p.docs?.certificate ? "birth certificate" : p.docs?.obituary ? "obituary" : "census record";
  if (field === "born" || field === "bornPlace") return p.docs?.certificate ? "birth certificate" : "family record";
  if (field === "died" || field === "diedPlace") return p.docs?.obituary ? "obituary" : "death record";
  return "source on file";
}

export function PersonRecord({
  id,
  onOpen,
  onNavigate,
  onToast,
}: {
  id: string;
  onOpen: (id: string, mode?: "edit") => void;
  onNavigate: (screen: Screen) => void;
  onToast: (msg: string) => void;
}) {
  const { people, media: allMedia, graph, events: allEvents } = useDataset();
  const p = people[id];
  const [docFilter, setDocFilter] = useState<string>("all");
  const [tab, setTab] = useState<string>("overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openMedia, setOpenMedia] = useState<MediaItem | null>(null);

  // The person may be absent from the current dataset — most commonly in the
  // brief window after creating someone, before router.refresh() pulls the new
  // row into context (also guards against a stale/broken link). Render a light
  // placeholder rather than dereferencing undefined.
  if (!p) {
    return (
      <div
        className="app-scroll"
        style={{ height: "100%", overflow: "auto", padding: "var(--space-xl) var(--space-2xl) var(--space-4xl)" }}
      >
        <div style={{ maxWidth: 940, margin: "0 auto" }} className="app-muted">
          Loading record…
        </div>
      </div>
    );
  }

  const rel = relationsOf(graph, id);
  const media = allMedia.filter((m) => m.people.includes(id));
  const events = eventsOf(allEvents, id);

  const summary = provSummary(p);

  // A compact, horizontally-scrolling preview of this person's life events; the
  // full chronology + add/edit lives on the Timeline tab.
  const EventStrip =
    events.length > 0 ? (
      <div>
        <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
          Life events
        </div>
        <div className="app-evstrip-wrap">
          <div className="app-evstrip">
            {events.slice(0, 5).map((ev) => {
              const m = meta(ev.type);
              return (
                <button key={ev.id} className="app-evcard" onClick={() => setTab("timeline")} title={ev.title}>
                  <div className="app-evcard-top">
                    <IconBadge icon={<Icon name={m.icon as IconName} />} color={m.color} size={26} />
                    <span className="app-evcard-date tnum">{fmtDate(ev)}</span>
                  </div>
                  <div className="app-evcard-title">{ev.title}</div>
                </button>
              );
            })}
            {events.length > 5 && (
              <button className="app-evcard app-evcard-more" onClick={() => setTab("timeline")}>
                <span className="app-display" style={{ fontSize: "var(--text-headline)" }}>+{events.length - 5}</span>
                <span className="app-muted" style={{ fontSize: "var(--text-body-sm)" }}>more</span>
              </button>
            )}
          </div>
        </div>
      </div>
    ) : null;

  const RelGroup = ({ title, items }: { title: string; items: Relation[] }) =>
    items.length ? (
      <div>
        <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
          {title}
        </div>
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          {items.map((r) => (
            <MiniNode key={r.id} id={r.id} rel={r.rel} onOpen={onOpen} />
          ))}
        </div>
      </div>
    ) : null;

  const bio = bioParas(p);
  // The full name history (earliest → latest, already sorted by the read model).
  // Shown only when there's a change to surface — a single birth name is already
  // the record's headline.
  const nameHistory = p.names ?? [];
  const NamesBlock =
    nameHistory.length > 1 ? (
      <div>
        <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
          Names
        </div>
        <div style={{ display: "grid", gap: "var(--space-sm)" }}>
          {nameHistory.map((n, i) => {
            const date = formatPartialDate(n.date ?? null);
            return (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-body)", color: "var(--color-ink)" }}>
                  {n.given} {n.surname}
                </span>
                <Chip dot={undefined} selected={i === nameHistory.length - 1}>
                  {NAME_REASON_LABEL[n.reason]}
                </Chip>
                {date && (
                  <span className="app-muted tnum" style={{ fontSize: "var(--text-body-sm)" }}>
                    {date}
                  </span>
                )}
                <ProvenanceMark status={n.prov} source={n.prov === "verified" ? n.source?.title : undefined} size={13} />
              </div>
            );
          })}
        </div>
      </div>
    ) : null;
  const Overview = (
    <div style={{ display: "grid", gap: "var(--space-2xl)", paddingTop: "var(--space-lg)" }}>
      <div>
        <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
          Biography
        </div>
        <div
          style={{
            maxWidth: "68ch",
            fontSize: "var(--text-body)",
            lineHeight: 1.55,
            color: "var(--color-ink)",
            display: "grid",
            gap: "0.75em",
          }}
        >
          {bio.map((para, i) => (
            <p key={i} style={{ margin: 0 }}>
              {para}
            </p>
          ))}
        </div>
      </div>
      {NamesBlock}
      {EventStrip}
      <div className="app-grid-rels">
        <RelGroup title="Parents" items={rel.parents} />
        <RelGroup title="Spouse" items={rel.spouse} />
        <RelGroup title="Children" items={rel.children} />
        <RelGroup title="Siblings" items={rel.siblings} />
      </div>
    </div>
  );

  const docTypes: [string, string, ChipDot | undefined][] = [
    ["all", "All", undefined],
    ["photo", "Photos", "photo"],
    ["certificate", "Certificates", "certificate"],
    ["article", "Articles", "article"],
    ["obituary", "Obituaries", "obituary"],
  ];
  const shownDocs = media.filter((m) => docFilter === "all" || m.type === docFilter);
  const Documents = (
    <div style={{ paddingTop: "var(--space-lg)" }}>
      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-lg)", alignItems: "center" }}>
        {docTypes.map(([k, label, dot]) => (
          <Chip key={k} selected={docFilter === k} dot={dot} onClick={() => setDocFilter(k)}>
            {label}
          </Chip>
        ))}
        <span style={{ marginLeft: "auto" }}>
          <Button variant="secondary" size="sm" iconStart={<Icon name="upload" size={16} />} onClick={() => setUploadOpen(true)}>
            Add document
          </Button>
        </span>
      </div>
      <div className="app-grid-docs">
        {shownDocs.map((m) => (
          <ClickableCard key={m.id} ariaLabel={`Open ${m.title}`} onOpen={() => setOpenMedia(m)}>
            <MediaThumb media={m} style={{ height: 130, borderRadius: 0, borderBottom: "1px solid var(--color-border)" }} />
            <div style={{ padding: "var(--space-md)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "var(--text-body-sm)",
                  color: "var(--color-muted)",
                  marginBottom: 5,
                }}
              >
                <DocDot type={m.type} /> {m.type}
                <span className="tnum" style={{ marginLeft: "auto" }}>
                  {m.year}
                </span>
              </div>
              <div style={{ fontSize: "var(--text-body-sm)", lineHeight: 1.3 }}>{m.title}</div>
            </div>
          </ClickableCard>
        ))}
      </div>
    </div>
  );

  const Notes = (
    <div style={{ paddingTop: "var(--space-lg)", display: "grid", gap: "var(--space-lg)", maxWidth: "68ch" }}>
      {(
        [
          ["Curator", "Mar 2024", "Cross-checked the 1940 census against the parish record; birthplace confirmed."],
          ["Aunt Margaret", "Jan 2024", "She always told the story of the crossing on the SS Carmania — added the manifest to documents."],
        ] as const
      ).map(([who, when, text]) => (
        <Card key={who}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--text-body-sm)",
              color: "var(--color-muted)",
              marginBottom: "var(--space-sm)",
            }}
          >
            <strong style={{ color: "var(--color-ink)" }}>{who}</strong>
            <span className="tnum">{when}</span>
          </div>
          <div style={{ fontSize: "var(--text-body)", lineHeight: 1.55 }}>{text}</div>
        </Card>
      ))}
      <div>
        <Button variant="ghost" size="sm" iconStart={<Icon name="plus" size={16} />}>
          Add note
        </Button>
      </div>
    </div>
  );

  const fmtFact = (field: string, raw: string | number) => {
    const st = provOf(p, field);
    const v = st === "estimated" && /^\d/.test(String(raw)) ? "c. " + raw : String(raw);
    return { v, st };
  };
  const bornText = formatPartialDate(p.bornDate ?? null) || (p.born != null ? String(p.born) : "?");
  const diedText = formatPartialDate(p.diedDate ?? null) || (p.died != null ? String(p.died) : "?");
  const facts = [
    { k: "Born", field: "born", ...fmtFact("born", bornText) },
    { k: "Birthplace", field: "bornPlace", ...fmtFact("bornPlace", (p.bornPlace ?? "?").split(",")[0]) },
    p.living
      ? { k: "Status", field: null as string | null, v: "Living", st: provOf(p, "name") }
      : { k: "Died", field: "died", ...fmtFact("died", diedText) },
    { k: "Documents", field: null as string | null, v: String(docCount(p)), st: provOf(p, "name") },
  ];

  return (
    <div
      className="app-scroll"
      style={{ height: "100%", overflow: "auto", padding: "var(--space-xl) var(--space-2xl) var(--space-4xl)" }}
    >
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <Breadcrumb
            items={[
              { label: "Family tree", onClick: () => onNavigate("explorer") },
              { label: `${p.surname} line` },
              { label: fullName(p) },
            ]}
          />
        </div>

        <Card>
          <div style={{ display: "flex", gap: "var(--space-lg)", alignItems: "flex-start" }}>
            <Avatar name={fullName(p)} size="lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="app-display"
                style={{ fontSize: "var(--text-display)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
              >
                <span>{fullName(p)}</span>
                <ProvenanceMark
                  status={provOf(p, "name")}
                  source={provOf(p, "name") === "verified" ? sourceFor(p, "name") : undefined}
                  size={16}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-headline)",
                  color: "var(--color-muted)",
                  marginTop: 2,
                }}
              >
                {lifeDates(p)}
                {p.maiden ? `  ·  née ${p.maiden}` : ""}
              </div>
              <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginTop: "var(--space-md)" }}>
                <Badge tone="neutral" dot>
                  {p.living ? "Living" : "Deceased"}
                </Badge>
                <Badge tone={summary.tone} dot>
                  {summary.label}
                </Badge>
                <Badge tone="info">{docCount(p)} documents</Badge>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)", flex: "none" }}>
              <Button variant="primary" iconStart={<Icon name="edit" size={16} />} onClick={() => onOpen(id, "edit")}>
                Edit
              </Button>
              <Menu
                align="end"
                trigger={<Button variant="secondary" iconStart={<Icon name="dots" size={16} />} aria-label="More actions" />}
                items={[
                  { label: "Share" },
                  { label: "Merge with…" },
                  { label: "Delete", danger: true },
                ]}
              />
            </div>
          </div>
          <hr className="app-divider" style={{ margin: "var(--space-lg) 0 var(--space-md)" }} />
          <div className="app-grid-facts">
            {facts.map((f) => (
              <div key={f.k}>
                <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-muted)" }}>{f.k}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <span
                    className="tnum"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-title)",
                      color: "var(--color-ink)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.v}
                  </span>
                  {f.field && (
                    <ProvenanceMark
                      status={f.st}
                      source={provSourceOf(p, f.field) ?? undefined}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ marginTop: "var(--space-xl)" }}>
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: "overview", label: "Overview", content: Overview },
              {
                value: "timeline",
                label: `Timeline (${events.length})`,
                content: <PersonTimeline id={id} onOpen={onOpen} onNavigate={onNavigate} />,
              },
              { value: "documents", label: `Documents (${media.length})`, content: Documents },
              { value: "notes", label: "Notes (2)", content: Notes },
            ]}
          />
        </div>
      </div>

      <MediaUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onToast={onToast}
        preselectPersonId={id}
      />
      <MediaDetail media={openMedia} onClose={() => setOpenMedia(null)} onOpen={onOpen} onToast={onToast} />
    </div>
  );
}
