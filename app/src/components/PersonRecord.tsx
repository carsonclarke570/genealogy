"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Chip,
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
  type Person,
  type Relation,
} from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { Icon } from "./Icon";
import { MiniNode, DocDot } from "./shared";
import type { Screen } from "./AppShell";

function bioParas(p: Person): string[] {
  const name = p.given.split(" ")[0];
  const born = `${name} was born in ${p.bornPlace} in ${p.born}`;
  const end = p.living ? " and is living." : `, and died in ${p.diedPlace} in ${p.died}.`;
  const second = p.maiden
    ? `Recorded under the family name ${p.surname} (née ${p.maiden}), ${name} appears across several family photographs and certificates in the archive.`
    : `${name}'s record draws on the photographs, certificates and articles attached below.`;
  return [born + end, second];
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
}: {
  id: string;
  onOpen: (id: string, mode?: "edit") => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { people, media: allMedia, units } = useDataset();
  const p = people[id];
  const [docFilter, setDocFilter] = useState<string>("all");

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

  const rel = relationsOf(units, id);
  const media = allMedia.filter((m) => m.people.includes(id));

  const summary = provSummary(p);

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
      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-lg)" }}>
        {docTypes.map(([k, label, dot]) => (
          <Chip key={k} selected={docFilter === k} dot={dot} onClick={() => setDocFilter(k)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="app-grid-docs">
        {shownDocs.map((m) => (
          <Card key={m.id} style={{ padding: 0, overflow: "hidden" }}>
            <div className="app-ph" style={{ height: 130, borderRadius: 0, borderWidth: "0 0 1px 0" }}>
              {m.type === "photo" ? "photo" : "document scan"}
            </div>
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
          </Card>
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
            defaultValue="overview"
            items={[
              { value: "overview", label: "Overview", content: Overview },
              { value: "documents", label: `Documents (${media.length})`, content: Documents },
              { value: "notes", label: "Notes (2)", content: Notes },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
