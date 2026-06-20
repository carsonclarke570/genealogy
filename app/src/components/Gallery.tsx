"use client";

import { useState } from "react";
import { Avatar, Button, Card, Chip, Select } from "@family-archive/ui";
import type { ChipDot } from "@family-archive/ui";
import { fullName } from "@/lib/family-data";
import { useDataset } from "@/lib/dataset";
import { Icon } from "./Icon";
import { DocDot } from "./shared";

const types: [string, string, ChipDot | undefined][] = [
  ["all", "All", undefined],
  ["photo", "Photos", "photo"],
  ["certificate", "Certificates", "certificate"],
  ["article", "Articles", "article"],
  ["obituary", "Obituaries", "obituary"],
  ["other", "Other", "other"],
];

export function Gallery({ onOpen }: { onOpen: (id: string) => void }) {
  const { people, media } = useDataset();
  const [filter, setFilter] = useState<string>("all");
  const items = media.filter((m) => filter === "all" || m.type === filter);

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
              {media.length} items · photos, certificates, articles &amp; obituaries
            </div>
          </div>
          <Button variant="primary" iconStart={<Icon name="upload" size={16} />}>
            Upload media
          </Button>
        </div>

        <div style={{ display: "flex", gap: "var(--space-sm)", margin: "var(--space-xl) 0 var(--space-lg)", flexWrap: "wrap", alignItems: "center" }}>
          {types.map(([k, label, dot]) => (
            <Chip key={k} selected={filter === k} dot={dot} onClick={() => setFilter(k)}>
              {label}
            </Chip>
          ))}
          <div style={{ marginLeft: "auto", minWidth: 170 }}>
            <Select aria-label="Sort">
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>By person</option>
            </Select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(232px, 1fr))", gap: "var(--space-lg)" }}>
          {items.map((m) => (
            <Card key={m.id} style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}>
              <div className="app-ph" style={{ height: 152, borderRadius: 0, borderWidth: "0 0 1px 0" }}>
                {m.type === "photo" ? "photo" : "scanned " + m.type}
              </div>
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
                  <span className="tnum" style={{ marginLeft: "auto" }}>
                    {m.year}
                  </span>
                </div>
                <div style={{ fontSize: "var(--text-body)", lineHeight: 1.3, marginBottom: "var(--space-sm)" }}>{m.title}</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {m.people.slice(0, 3).map((pid, i) => (
                    <span
                      key={pid}
                      style={{ marginLeft: i ? -8 : 0, outline: "2px solid var(--color-bg)", borderRadius: "50%" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(pid);
                      }}
                    >
                      <Avatar name={fullName(people[pid])} size="sm" />
                    </span>
                  ))}
                  <span className="app-muted" style={{ fontSize: "var(--text-body-sm)", marginLeft: "var(--space-sm)" }}>
                    {m.people.length} {m.people.length === 1 ? "person" : "people"}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
