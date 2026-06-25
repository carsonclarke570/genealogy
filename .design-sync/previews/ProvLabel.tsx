import { ProvLabel } from "@family-archive/ui";
import type { SourceOption } from "@family-archive/ui";

const SOURCES: SourceOption[] = [
  { id: "bc", label: "Birth certificate — Eleanor Whitfield", type: "certificate", year: 1888 },
  { id: "cen", label: "1911 census — Reardon household", type: "census", year: 1911 },
];

const sheet: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 12,
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-label)",
  fontWeight: 500,
  color: "var(--color-ink)",
};

// A field label that carries its confidence mark inline — pass it as any
// control's `label` so every fact answers "how do we know this?".
export function States() {
  return (
    <div style={sheet}>
      <ProvLabel label="Born" status="verified" sources={SOURCES} onChange={() => {}} />
      <ProvLabel label="Birthplace" status="unverified" sources={SOURCES} onChange={() => {}} />
      <ProvLabel label="Died" status="estimated" sources={SOURCES} onChange={() => {}} />
      <ProvLabel label="Maiden name" status="disputed" sources={SOURCES} onChange={() => {}} />
    </div>
  );
}
