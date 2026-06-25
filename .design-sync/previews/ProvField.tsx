import { ProvField } from "@family-archive/ui";
import type { SourceOption } from "@family-archive/ui";

const SOURCES: SourceOption[] = [
  { id: "bc", label: "Birth certificate — Eleanor Whitfield", type: "certificate", year: 1888 },
  { id: "ob", label: "Obituary — Boston Globe", type: "obituary", year: 1971 },
  { id: "cen", label: "1911 census — Reardon household", type: "census", year: 1911 },
];

const sheet: React.CSSProperties = { display: "grid", gap: 16, maxWidth: 460, padding: 8 };

// A recorded fact: the value on the left, a confidence mark on its label that
// opens to set status and cite a source. One field per confidence state.
export function ConfidenceStates() {
  return (
    <div style={sheet}>
      <ProvField
        label="Full name"
        fieldKey="name"
        defaultValue="Eleanor Margaret Whitfield"
        status="verified"
        sources={SOURCES}
        onProvChange={() => {}}
      />
      <ProvField
        label="Birth year"
        fieldKey="birthYear"
        defaultValue="1888"
        status="unverified"
        sources={SOURCES}
        onProvChange={() => {}}
      />
      <ProvField
        label="Death year"
        fieldKey="deathYear"
        defaultValue="1971"
        status="estimated"
        sources={SOURCES}
        onProvChange={() => {}}
      />
    </div>
  );
}

// Required and invalid.
export function WithError() {
  return (
    <div style={sheet}>
      <ProvField
        label="Maiden name"
        fieldKey="maiden"
        required
        defaultValue=""
        error="A maiden name is required for this record"
        status="disputed"
        sources={SOURCES}
        onProvChange={() => {}}
      />
    </div>
  );
}
