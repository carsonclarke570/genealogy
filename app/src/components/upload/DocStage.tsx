/** Stage 1 of the upload wizard: describe the document on the left. */
"use client";

import { Callout, Input, Select, Textarea } from "@family-archive/ui";
import { MEDIA_TYPES } from "@/lib/media-validation";

const TYPE_LABELS: [(typeof MEDIA_TYPES)[number], string][] = [
  ["photo", "Photo"],
  ["certificate", "Certificate"],
  ["article", "Article"],
  ["obituary", "Obituary"],
  ["census", "Census"],
  ["grave", "Grave"],
  ["other", "Other"],
];

export interface DocFields {
  title: string;
  type: (typeof MEDIA_TYPES)[number];
  year: string;
  description: string;
}

export function DocStage({
  doc,
  set,
  errors,
}: {
  doc: DocFields;
  set: (patch: Partial<DocFields>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="app-stagebody">
      <div className="app-stage-h">Document details</div>
      <p className="app-muted app-stage-sub">
        Describe the scan on the left. You&rsquo;ll attribute it to people and record what it proves on the next steps.
      </p>
      <div style={{ display: "grid", gap: "var(--space-lg)" }}>
        <Input
          label="Title"
          required
          value={doc.title}
          onChange={(e) => set({ title: e.target.value })}
          error={errors.title}
          placeholder="e.g. Eleanor Whitfield — birth certificate"
        />
        <div className="app-field-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Select label="Type" value={doc.type} onChange={(e) => set({ type: e.target.value as (typeof MEDIA_TYPES)[number] })}>
              {TYPE_LABELS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 120, flex: "none" }}>
            <Input label="Year" inputMode="numeric" value={doc.year} onChange={(e) => set({ year: e.target.value })} placeholder="1915" error={errors.year} />
          </div>
        </div>
        <Callout tone="success">
          Facts you record from this document are marked <strong>Verified</strong> and cited to it.
        </Callout>
        <Textarea
          label="Description (optional)"
          rows={3}
          value={doc.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Notes, provenance, who / what / where…"
        />
      </div>
    </div>
  );
}
