"use client";

/**
 * Search screen — a debounced client over the hybrid search endpoint
 * (POST /api/search): dense pgvector similarity fused with Postgres full-text.
 * The API returns ranked hits (ids + scores + snippets); we hydrate the result
 * cards from the in-memory Dataset context by id, so the payload stays small.
 * Falls back to keyword-only ranking when the embedding server is offline.
 */
import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Chip, EmptyState, Spinner } from "@family-archive/ui";
import { fullName, lifeDates, docCount, relationsOf } from "@/lib/family-data";
import type { MediaItem } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { Icon } from "./Icon";
import { DocDot } from "./shared";
import type { Screen } from "./AppShell";

type Scope = "all" | "people" | "docs" | "places";
interface Hit {
  id: string;
  kind: "person" | "media";
  score: number;
  snippet: string;
  matchedPlace: boolean;
}
interface ApiResult {
  hits: Hit[];
  mode: "vector" | "lexical";
}

const SCOPES: [Scope, string][] = [
  ["all", "Everything"],
  ["people", "People"],
  ["docs", "Documents"],
  ["places", "Places"],
];

export function Search({
  onOpen,
  onNavigate,
}: {
  onOpen: (id: string) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { people, media, graph } = useDataset();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [hits, setHits] = useState<Hit[]>([]);
  const [mode, setMode] = useState<"vector" | "lexical">("vector");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [reloadKey, setReloadKey] = useState(0);

  // Debounced, abortable search. Prior results stay on screen while reloading.
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setHits([]);
      setStatus("idle");
      return;
    }
    const ctrl = new AbortController();
    setStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q: query, scope, limit: 30 }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiResult = await res.json();
        setHits(data.hits);
        setMode(data.mode);
        setStatus("ready");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, scope, reloadKey]);

  const mediaById = useMemo(() => {
    const m: Record<string, MediaItem> = {};
    for (const x of media) m[x.id] = x;
    return m;
  }, [media]);

  // Keep only hits we can actually render (id present in the loaded Dataset).
  const peopleHits = hits.filter((h) => h.kind === "person" && people[h.id]);
  const docHits = hits.filter((h) => h.kind === "media" && mediaById[h.id]);
  const total = peopleHits.length + docHits.length;

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
          {status === "loading" && <Spinner size="sm" />}
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

        <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)", alignItems: "center" }}>
          {SCOPES.map(([k, label]) => (
            <Chip key={k} selected={scope === k} onClick={() => setScope(k)}>
              {label}
            </Chip>
          ))}
          {status === "ready" && mode === "lexical" && (
            <span className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginLeft: "auto" }}>
              Keyword search
            </span>
          )}
        </div>

        {status === "idle" ? (
          <div style={{ marginTop: "var(--space-2xl)" }}>
            <EmptyState
              icon={<Icon name="search" size={26} />}
              title="Search your family archive"
              description="Find people and documents by name, place, year, or a description of what you remember."
            />
          </div>
        ) : status === "error" ? (
          <div style={{ marginTop: "var(--space-2xl)" }}>
            <EmptyState
              icon={<Icon name="search" size={26} />}
              title="Search is unavailable"
              description="Something went wrong running that search. Please try again."
              action={
                <Button variant="primary" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : total === 0 && status === "ready" ? (
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
              {total} {total === 1 ? "result" : "results"} for “{q}”
            </div>

            {peopleHits.length > 0 && (
              <div style={{ marginBottom: "var(--space-2xl)" }}>
                <div className="app-label" style={{ marginBottom: "var(--space-md)" }}>
                  People
                </div>
                <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                  {peopleHits.map((hit) => {
                    const p = people[hit.id];
                    const rel = relationsOf(graph, p.id);
                    const hint = rel.spouse[0]
                      ? "Spouse of " + people[rel.spouse[0].id].given.split(" ")[0]
                      : rel.children.length
                        ? rel.children.length + " children"
                        : "";
                    return (
                      <Card key={hit.id} style={{ padding: "10px 14px", cursor: "pointer" }}>
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
                            {hit.snippet && (
                              <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
                                <Highlighted text={hit.snippet} />
                              </div>
                            )}
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

            {docHits.length > 0 && (
              <div>
                <div className="app-label" style={{ marginBottom: "var(--space-md)" }}>
                  Documents
                </div>
                <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                  {docHits.map((hit) => {
                    const m = mediaById[hit.id];
                    return (
                      <Card key={hit.id} style={{ padding: "10px 14px", cursor: "pointer" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}
                          onClick={() => onNavigate("gallery")}
                        >
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
                            {hit.snippet && (
                              <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 2 }}>
                                <Highlighted text={hit.snippet} />
                              </div>
                            )}
                          </div>
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
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Render a ts_headline snippet whose matches are wrapped in ⟪ ⟫ sentinels
 * (set in lib/search/query.ts). Splitting on the sentinels keeps highlighting
 * without injecting HTML — odd segments are the highlighted spans.
 */
function Highlighted({ text }: { text: string }) {
  const parts = text.split(/⟪|⟫/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} style={{ color: "var(--color-ink)", fontWeight: 600 }}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
