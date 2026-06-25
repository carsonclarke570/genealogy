import { DetailRow, ProvenanceMark } from "@family-archive/ui";

const sheet: React.CSSProperties = {
  display: "grid",
  gap: 2,
  maxWidth: 460,
  padding: 8,
};
const serif: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: "var(--text-body)",
  color: "var(--color-ink)",
  fontFeatureSettings: '"tnum" 1',
};
const factRow: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6 };

// The label/value rows that make up a person's record — quiet label left,
// value right, aligned down the page.
export function RecordFacts() {
  return (
    <div style={sheet}>
      <DetailRow label="Full name">
        <span style={{ ...serif, fontFamily: "var(--font-serif)" }}>Eleanor Margaret Whitfield</span>
      </DetailRow>
      <DetailRow label="Born">
        <span style={factRow}>
          <span style={serif}>1888</span>
          <ProvenanceMark status="verified" source="birth certificate" />
        </span>
      </DetailRow>
      <DetailRow label="Birthplace">
        <span style={factRow}>
          <span style={serif}>Cork, Ireland</span>
          <ProvenanceMark status="unverified" />
        </span>
      </DetailRow>
      <DetailRow label="Died">
        <span style={serif}>1971</span>
      </DetailRow>
      <DetailRow label="Record ID">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--color-muted)" }}>P-00417</span>
      </DetailRow>
    </div>
  );
}
