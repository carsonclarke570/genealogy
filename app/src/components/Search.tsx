"use client";

import { useState } from "react";
import { Avatar, Badge, Button, Card, Chip, EmptyState } from "@family-archive/ui";
import { fullName, lifeDates, docCount, relationsOf } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { Icon } from "./Icon";
import { DocDot } from "./shared";
import type { Screen } from "./AppShell";

export function Search({
  onOpen,
  onNavigate,
}: {
  onOpen: (id: string) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { people, media, units } = useDataset();
  const [q, setQ] = useState("whitfield");
  const [scope, setScope] = useState<string>("all");

  const matchedPeople = Object.values(people).filter((p) =>
    `${fullName(p)} ${p.maiden || ""}`.toLowerCase().includes(q.toLowerCase())
  );
  const docs = media.filter((m) =>
    `${m.title} ${m.people.map((id) => fullName(people[id])).join(" ")}`.toLowerCase().includes(q.toLowerCase())
  );
  const showPeople = scope === "all" || scope === "people";
  const showDocs = scope === "all" || scope === "docs";
  const total = (showPeople ? matchedPeople.length : 0) + (showDocs ? docs.length : 0);

  return (
    <div
      className="app-scroll"
      style={{ height: "100%", overflow: "auto", padding: "var(--space-2xl) var(--space-2xl) var(--space-4xl)" }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            padding: "12px 16px",
            background: "var(--color-surface-sunken)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span style={{ color: "var(--color-muted)", flex: "none", display: "inline-flex" }}>
            <Icon name="search" size={20} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, documents, places…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "1.125rem",
              fontFamily: "var(--font-sans)",
              color: "var(--color-ink)",
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", display: "inline-flex" }}
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
          {(
            [
              ["all", "Everything"],
              ["people", "People"],
              ["docs", "Documents"],
              ["places", "Places"],
            ] as const
          ).map(([k, label]) => (
            <Chip key={k} selected={scope === k} onClick={() => setScope(k)}>
              {label}
            </Chip>
          ))}
        </div>

        {total === 0 ? (
          <div style={{ marginTop: "var(--space-2xl)" }}>
            <EmptyState
              icon={<Icon name="search" size={26} />}
              title={`No matches for “${q}”`}
              description="Try a surname, a place, or a year — or add this person to the tree."
              action={
                <Button variant="primary" iconStart={<Icon name="plus" size={16} />} onClick={() => onNavigate("add")}>
                  Add a person
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", margin: "var(--space-xl) 0 var(--space-md)" }}>
              {total} results for “{q}”
            </div>

            {showPeople && matchedPeople.length > 0 && (
              <div style={{ marginBottom: "var(--space-2xl)" }}>
                <div className="app-label" style={{ marginBottom: "var(--space-md)" }}>
                  People
                </div>
                <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                  {matchedPeople.map((p) => {
                    const rel = relationsOf(units, p.id);
                    const hint = rel.spouse[0]
                      ? "Spouse of " + people[rel.spouse[0].id].given.split(" ")[0]
                      : rel.children.length
                        ? rel.children.length + " children"
                        : "";
                    return (
                      <Card key={p.id} style={{ padding: "10px 14px", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }} onClick={() => onOpen(p.id)}>
                          <Avatar name={fullName(p)} size="md" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-title)", color: "var(--color-ink)" }}>
                              {fullName(p)}
                              {p.maiden ? (
                                <span className="app-muted" style={{ fontSize: "var(--text-body-sm)" }}>
                                  {" "}
                                  · née {p.maiden}
                                </span>
                              ) : null}
                            </div>
                            <div className="app-muted tnum" style={{ fontSize: "var(--text-body-sm)" }}>
                              {lifeDates(p)}
                              {hint ? " · " + hint : ""}
                            </div>
                          </div>
                          {docCount(p) > 0 && <Badge tone="info">{docCount(p)} docs</Badge>}
                          <span style={{ color: "var(--color-faint, var(--color-muted))", display: "inline-flex" }}>
                            <Icon name="chevron" />
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {showDocs && docs.length > 0 && (
              <div>
                <div className="app-label" style={{ marginBottom: "var(--space-md)" }}>
                  Documents
                </div>
                <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                  {docs.map((m) => (
                    <Card key={m.id} style={{ padding: "10px 14px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                        <div className="app-ph" style={{ width: 46, height: 46, flex: "none", fontSize: 11 }}>
                          {m.type === "photo" ? "img" : "doc"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "var(--text-body)" }}>{m.title}</div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: "var(--text-body-sm)",
                              color: "var(--color-muted)",
                              marginTop: 2,
                            }}
                          >
                            <DocDot type={m.type} />
                            {m.type} · <span className="tnum">{m.year}</span>
                          </div>
                        </div>
                        <span style={{ color: "var(--color-faint, var(--color-muted))", display: "inline-flex" }}>
                          <Icon name="chevron" />
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
