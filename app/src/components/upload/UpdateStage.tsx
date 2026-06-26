/**
 * Stage 3…N of the upload wizard: one per subject. Schema-driven — each registry
 * model becomes an Accordion section (identity fields, birth/death rows, or an
 * add/edit/remove collection), so new record models appear here automatically.
 */
"use client";

import { useState } from "react";
import { Accordion, Avatar, Badge } from "@family-archive/ui";
import { fullName, lifeDates } from "@/lib/family-data";
import { MODELS, originalValue, type CollItem } from "@/lib/staged-upload/registry";
import { subjectChanges } from "@/lib/staged-upload/diff";
import type { SubjectDraft, LeafValue } from "@/lib/staged-upload/registry";
import { Icon } from "../Icon";
import { Collection, Leaf } from "./fields";
import type { Subject, UploadCtx } from "./shared";

export function UpdateStage({
  subject,
  ctx,
  onDraft,
}: {
  subject: Subject;
  ctx: UploadCtx;
  onDraft: (draft: SubjectDraft) => void;
}) {
  const p = subject.person;
  const draft = subject.draft;
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ person: true, life: true }));
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // Group this subject's changes per model, to drive the count pills + danger marks.
  const byModel = subjectChanges(p, draft, ctx).reduce<Record<string, { n: number; danger: number }>>((acc, c) => {
    const e = (acc[c.modelKey] ??= { n: 0, danger: 0 });
    e.n++;
    if (c.danger) e.danger++;
    return acc;
  }, {});

  const setLeaf = (path: string, v: LeafValue) => onDraft({ ...draft, leaves: { ...draft.leaves, [path]: v } });
  const setColl = (key: "names" | "rels" | "residences" | "events", next: CollItem[]) => onDraft({ ...draft, [key]: next });

  return (
    <div className="app-stagebody">
      <div className="app-subjhead">
        <Avatar name={fullName(p)} size="md" />
        <div style={{ minWidth: 0 }}>
          <div className="app-display app-subjhead-name">
            {fullName(p)} {subject.kind === "new" && <Badge tone="info">New person</Badge>}
          </div>
          <div className="app-muted app-subjhead-dates">{lifeDates(p)}</div>
        </div>
      </div>
      <p className="app-muted app-stage-sub">
        Record only what this document shows about {p.given.split(" ")[0]}. Each section maps to a part of their record.
      </p>

      <div className="app-accord-stack">
        {MODELS.map((m) => {
          const cm = byModel[m.key] ?? { n: 0, danger: 0 };
          return (
            <Accordion
              key={m.key}
              icon={<Icon name={m.icon} size={16} />}
              title={m.label}
              count={cm.n}
              danger={cm.danger > 0}
              open={!!open[m.key]}
              onToggle={() => toggle(m.key)}
            >
              {m.blurb && <div className="app-accord-blurb">{m.blurb}</div>}

              {m.kind === "fields" && (
                <div className="app-fgrid">
                  {m.fields.map((f) => (
                    <Leaf
                      key={f.key}
                      field={f}
                      pathKey={`${m.key}.${f.key}`}
                      original={originalValue(p, m.key, f.key)}
                      leaves={draft.leaves}
                      ctx={ctx}
                      onSet={setLeaf}
                    />
                  ))}
                </div>
              )}

              {m.kind === "rows" && (
                <div className="app-rows">
                  {m.rows.map((row) => (
                    <div key={row.key} className="app-row-card">
                      <div className="app-row-label">{row.label}</div>
                      <div className="app-fgrid">
                        {row.fields.map((f) => (
                          <Leaf
                            key={f.key}
                            field={f}
                            pathKey={`${m.key}.${row.key}.${f.key}`}
                            original={originalValue(p, m.key, `${row.key}.${f.key}`)}
                            leaves={draft.leaves}
                            ctx={ctx}
                            onSet={setLeaf}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {m.kind === "collection" && (
                <Collection
                  model={m}
                  items={draft[m.key as "names" | "rels" | "residences" | "events"] as CollItem[]}
                  ctx={ctx}
                  onItems={(next) => setColl(m.key as "names" | "rels" | "residences" | "events", next)}
                />
              )}
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}
