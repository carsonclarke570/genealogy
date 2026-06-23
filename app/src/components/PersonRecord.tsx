"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Chip,
  EmptyState,
  IconBadge,
  Menu,
  ProvenanceMark,
  Tabs,
} from "@family-archive/ui";
import type { ChipDot } from "@family-archive/ui";
import { formatPartialDate, formatLocation } from "@family-archive/ui";
import {
  fullName,
  lifeDates,
  docCount,
  provOf,
  provSourceOf,
  provSummary,
  relationsOf,
  residencesOf,
  residenceSpan,
  NAME_REASON_LABEL,
  type Relation,
  type MediaItem,
  type Residence,
} from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { eventsOf, fmtDate, meta } from "@/lib/timeline";
import { Icon, type IconName } from "./Icon";
import { PersonTimeline } from "./Timeline";
import { MiniNode, DocDot, MediaThumb, ClickableCard } from "./shared";
import { MediaUpload } from "./MediaUpload";
import { MediaDetail } from "./MediaDetail";
import { AddResidenceDialog } from "./AddResidenceDialog";
import type { Screen } from "./AppShell";

/**
 * Split the single free-text `notes` field into paragraphs. Blank lines (or any
 * run of newlines) start a new paragraph; we never synthesise prose — what the
 * curator recorded is all that shows.
 */
function notesParagraphs(notes: string | null | undefined): string[] {
  return (notes ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
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
  const { people, media: allMedia, graph, events: allEvents, residences: allResidences } = useDataset();
  const p = people[id];
  const [docFilter, setDocFilter] = useState<string>("all");
  const [tab, setTab] = useState<string>("overview");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openMedia, setOpenMedia] = useState<MediaItem | null>(null);
  // null = closed; { residence } where residence is null for "add" or a row to edit.
  const [residenceEdit, setResidenceEdit] = useState<{ residence: Residence | null } | null>(null);

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
  const residences = residencesOf(allResidences, id);

  const firstName = p.given.split(" ")[0];
  const hasRels =
    rel.parents.length + rel.spouse.length + rel.children.length + rel.siblings.length > 0;
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

  const bio = notesParagraphs(p.notes);
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
    <div style={{ display: "grid", gap: "var(--space-2xl)" }}>
      <div>
        <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
          Biography
        </div>
        {bio.length > 0 ? (
          <div
            style={{
              maxWidth: "68ch",
              fontSize: "var(--text-body)",
              lineHeight: 1.55,
              color: "var(--color-ink)",
              display: "grid",
              gap: "0.75em",
              textWrap: "pretty",
            }}
          >
            {bio.map((para, i) => (
              <p key={i} style={{ margin: 0 }}>
                {para}
              </p>
            ))}
          </div>
        ) : (
          <p className="app-muted" style={{ margin: 0, maxWidth: "68ch", fontSize: "var(--text-body)" }}>
            No biography recorded yet.{" "}
            <button type="button" className="app-link" onClick={() => onOpen(id, "edit")}>
              Add one
            </button>
            .
          </p>
        )}
      </div>
      {NamesBlock}
      {EventStrip}
      {hasRels ? (
        <div className="app-grid-rels">
          <RelGroup title="Parents" items={rel.parents} />
          <RelGroup title="Spouse" items={rel.spouse} />
          <RelGroup title="Children" items={rel.children} />
          <RelGroup title="Siblings" items={rel.siblings} />
        </div>
      ) : (
        <div>
          <div className="app-label" style={{ marginBottom: "var(--space-sm)" }}>
            Relationships
          </div>
          <p className="app-muted" style={{ margin: 0, maxWidth: "68ch", fontSize: "var(--text-body)" }}>
            No relationships recorded yet.{" "}
            <button type="button" className="app-link" onClick={() => onOpen(id, "edit")}>
              Link a parent, spouse, child or sibling
            </button>
            .
          </p>
        </div>
      )}
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
  const activeDocLabel = (docTypes.find(([k]) => k === docFilter)?.[1] ?? "documents").toLowerCase();
  const Documents = (
    <div>
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
      {shownDocs.length === 0 ? (
        media.length === 0 ? (
          <EmptyState
            icon={<Icon name="gallery" size={24} />}
            title="No documents yet"
            description={`Attach a photo, certificate, article or obituary to ${firstName}'s record.`}
            action={
              <Button variant="secondary" iconStart={<Icon name="upload" size={16} />} onClick={() => setUploadOpen(true)}>
                Add document
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Icon name="gallery" size={24} />}
            title={`No ${activeDocLabel} yet`}
            description="Nothing matches this filter."
            action={
              <Button variant="secondary" onClick={() => setDocFilter("all")}>
                Show all documents
              </Button>
            }
          />
        )
      ) : (
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
      )}
    </div>
  );

  const Residences = (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-md)",
          marginBottom: "var(--space-lg)",
        }}
      >
        <p className="app-muted" style={{ margin: 0, fontSize: "var(--text-body-sm)", maxWidth: "52ch" }}>
          Where {p.given.split(" ")[0]} lived, and for how long. Each span carries its own provenance.
        </p>
        <span style={{ flex: "none" }}>
          <Button
            variant="secondary"
            size="sm"
            iconStart={<Icon name="plus" size={16} />}
            onClick={() => setResidenceEdit({ residence: null })}
          >
            Add residence
          </Button>
        </span>
      </div>

      {residences.length === 0 ? (
        <div className="app-muted" style={{ fontSize: "var(--text-body)" }}>
          No residencies recorded yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-sm)", maxWidth: "68ch" }}>
          {residences.map((r) => {
            const detail = formatLocation(r.location);
            const secondary = detail && detail !== r.place.trim() ? detail : null;
            return (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-md)",
                  padding: "var(--space-md) 0",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <span style={{ flex: "none", paddingTop: 2, color: "var(--color-muted)" }}>
                  <Icon name="pin" size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-body)", color: "var(--color-ink)" }}>
                      {r.place}
                    </span>
                    <ProvenanceMark status={r.prov} source={r.source?.title} size={13} />
                  </div>
                  {secondary && (
                    <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 1 }}>
                      {secondary}
                    </div>
                  )}
                  {r.note && (
                    <div style={{ fontSize: "var(--text-body-sm)", color: "var(--color-ink)", marginTop: 4, lineHeight: 1.45 }}>
                      {r.note}
                    </div>
                  )}
                </div>
                <span
                  className="app-muted tnum"
                  style={{ flex: "none", fontSize: "var(--text-body-sm)", whiteSpace: "nowrap", paddingTop: 2 }}
                >
                  {residenceSpan(r)}
                </span>
                <span style={{ flex: "none" }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconStart={<Icon name="edit" size={15} />}
                    aria-label={`Edit residence in ${r.place}`}
                    onClick={() => setResidenceEdit({ residence: r })}
                  >
                    Edit
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      )}
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
                  source={provOf(p, "name") === "verified" ? provSourceOf(p, "name") ?? undefined : undefined}
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
                trigger={<Button variant="secondary" iconOnly iconStart={<Icon name="dots" size={16} />} aria-label="More actions" />}
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
              { value: "residences", label: `Residences (${residences.length})`, content: Residences },
              { value: "documents", label: `Documents (${media.length})`, content: Documents },
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
      <AddResidenceDialog
        open={residenceEdit !== null}
        onClose={() => setResidenceEdit(null)}
        personId={id}
        editResidence={residenceEdit?.residence ?? null}
        onSaved={onToast}
      />
    </div>
  );
}
