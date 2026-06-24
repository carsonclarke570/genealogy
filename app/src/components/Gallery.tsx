"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Chip, EmptyState, ProvenanceMark, Select } from "@family-archive/ui";
import type { ChipDot } from "@family-archive/ui";
import { fullName, type MediaItem, type Person } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { Icon } from "./Icon";
import { DocDot, MediaThumb, ClickableCard } from "./shared";
import { MediaDetail } from "./MediaDetail";

type SortKey = "newest" | "oldest" | "person";

/** Order the filtered media for the chosen sort. Pure; `people` resolves the
 *  first linked person's name for the "By person" ordering. */
function sortMedia(items: MediaItem[], sort: SortKey, people: Record<string, Person>): MediaItem[] {
  const firstName = (m: MediaItem) => {
    const p = m.people[0] ? people[m.people[0]] : undefined;
    return p ? fullName(p).toLowerCase() : "￿"; // unlinked sort last
  };
  const sorted = [...items];
  if (sort === "person") sorted.sort((a, b) => firstName(a).localeCompare(firstName(b)));
  else sorted.sort((a, b) => (sort === "newest" ? b.year - a.year : a.year - b.year));
  return sorted;
}

const types: [string, string, ChipDot | undefined][] = [
  ["all", "All", undefined],
  ["photo", "Photos", "photo"],
  ["certificate", "Certificates", "certificate"],
  ["article", "Articles", "article"],
  ["obituary", "Obituaries", "obituary"],
  ["census", "Census", "census"],
  ["grave", "Graves", "grave"],
  ["other", "Other", "other"],
];

export function Gallery({
  onOpen,
  onToast,
  onUpload,
}: {
  onOpen: (id: string) => void;
  onToast: (msg: string) => void;
  /** Open the full-screen upload screen. */
  onUpload: () => void;
}) {
  const { people, media } = useDataset();
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [openMedia, setOpenMedia] = useState<MediaItem | null>(null);
  const items = useMemo(
    () => sortMedia(media.filter((m) => filter === "all" || m.type === filter), sort, people),
    [media, filter, sort, people],
  );

  // First-run: production boots with an empty archive. A filtered view with no
  // matches is a different, lighter empty state (the data exists, the filter hides it).
  const isEmptyArchive = media.length === 0;
  const isEmptyFilter = !isEmptyArchive && items.length === 0;
  const activeLabel = (types.find(([k]) => k === filter)?.[1] ?? "items").toLowerCase();

  return (
    <div
      className="app-scroll"
      style={{ height: "100%", overflow: "auto", padding: "var(--space-xl) var(--space-2xl) var(--space-4xl)" }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "var(--space-lg)", flexWrap: "wrap" }}>
          <div>
            <div className="app-display" style={{ fontSize: "var(--text-display)" }}>
              Media archive
            </div>
            <div className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginTop: 4 }}>
              {isEmptyArchive
                ? "Photos, certificates, articles & obituaries — all in one place"
                : `${media.length} ${media.length === 1 ? "item" : "items"} · photos, certificates, articles & obituaries`}
            </div>
          </div>
          {/* When empty, the empty-state below carries the single primary CTA (one-voice rule). */}
          {!isEmptyArchive && (
            <Button variant="primary" iconStart={<Icon name="upload" size={16} />} onClick={onUpload}>
              Upload media
            </Button>
          )}
        </div>

        {isEmptyArchive ? (
          <div style={{ marginTop: "var(--space-4xl)" }}>
            <EmptyState
              icon={<Icon name="gallery" size={26} />}
              title="No media in the archive yet"
              description="This is where the family's photos, certificates, articles and obituaries live. Upload the first one to begin."
              action={
                <Button variant="primary" iconStart={<Icon name="upload" size={16} />} onClick={onUpload}>
                  Upload media
                </Button>
              }
            />
          </div>
        ) : (
          <>
        <div style={{ display: "flex", gap: "var(--space-sm)", margin: "var(--space-xl) 0 var(--space-lg)", flexWrap: "wrap", alignItems: "center" }}>
          {types.map(([k, label, dot]) => (
            <Chip key={k} selected={filter === k} dot={dot} onClick={() => setFilter(k)}>
              {label}
            </Chip>
          ))}
          <div style={{ marginLeft: "auto", minWidth: 170 }}>
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="person">By person</option>
            </Select>
          </div>
        </div>

        {isEmptyFilter ? (
          <div style={{ marginTop: "var(--space-2xl)" }}>
            <EmptyState
              icon={<Icon name="gallery" size={26} />}
              title={`No ${activeLabel} yet`}
              description="Nothing matches this filter. Upload one, or show everything in the archive."
              action={
                <Button variant="secondary" onClick={() => setFilter("all")}>
                  Show all
                </Button>
              }
            />
          </div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(232px, 1fr))", gap: "var(--space-lg)" }}>
          {items.map((m) => (
            <ClickableCard key={m.id} ariaLabel={`Open ${m.title}`} onOpen={() => setOpenMedia(m)}>
              <MediaThumb media={m} style={{ height: 152, borderRadius: 0, borderBottom: "1px solid var(--color-border)" }} />
              <div style={{ padding: "var(--space-md)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "var(--text-body-sm)",
                    color: "var(--color-muted)",
                    marginBottom: 6,
                  }}
                >
                  <DocDot type={m.type} />
                  {m.type}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <ProvenanceMark status={m.prov} size={14} />
                    <span className="tnum">{m.year}</span>
                  </span>
                </div>
                <div style={{ fontSize: "var(--text-body)", lineHeight: 1.3, marginBottom: "var(--space-sm)" }}>{m.title}</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {m.people.slice(0, 3).map((pid, i) => (
                    <button
                      key={pid}
                      type="button"
                      className="fa-card-raise"
                      aria-label={`Open ${fullName(people[pid])}`}
                      onClick={() => onOpen(pid)}
                      style={{
                        marginLeft: i ? -8 : 0,
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        outline: "2px solid var(--color-bg)",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "inline-flex",
                      }}
                    >
                      <Avatar name={fullName(people[pid])} size="sm" />
                    </button>
                  ))}
                  <span className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginLeft: "var(--space-sm)" }}>
                    {m.people.length} {m.people.length === 1 ? "person" : "people"}
                  </span>
                </div>
              </div>
            </ClickableCard>
          ))}
        </div>
        )}
          </>
        )}
      </div>

      <MediaDetail media={openMedia} onClose={() => setOpenMedia(null)} onOpen={onOpen} onToast={onToast} />
    </div>
  );
}
