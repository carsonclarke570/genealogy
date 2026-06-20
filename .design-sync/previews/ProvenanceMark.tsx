import { ProvenanceMark } from "@family-archive/ui";

// The four confidence states — colour + icon + tooltip, never colour alone.
export function States() {
  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-body)",
    color: "var(--color-ink)",
  };
  return (
    <div style={{ display: "grid", gap: 12, padding: 8 }}>
      <span style={row}>
        <ProvenanceMark status="verified" source="birth certificate" /> Verified — cites a source
      </span>
      <span style={row}>
        <ProvenanceMark status="unverified" /> Unverified — recorded, no source yet
      </span>
      <span style={row}>
        <ProvenanceMark status="estimated" /> Estimated — approximate
      </span>
      <span style={row}>
        <ProvenanceMark status="disputed" /> Disputed — sources disagree
      </span>
    </div>
  );
}

// How the mark reads in situ — beside the facts of a record.
export function BesideFacts() {
  const fact: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "var(--font-serif)",
    fontSize: "var(--text-title)",
    color: "var(--color-ink)",
    fontFeatureSettings: '"tnum" 1',
  };
  const label: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-body-sm)",
    color: "var(--color-muted)",
  };
  return (
    <div style={{ display: "grid", gap: 14, padding: 8 }}>
      <div>
        <div style={label}>Born</div>
        <div style={fact}>
          1915 <ProvenanceMark status="verified" source="birth certificate" />
        </div>
      </div>
      <div>
        <div style={label}>Birthplace</div>
        <div style={fact}>
          Boston, MA <ProvenanceMark status="unverified" />
        </div>
      </div>
      <div>
        <div style={label}>Died</div>
        <div style={fact}>
          c. 1944 <ProvenanceMark status="estimated" />
        </div>
      </div>
    </div>
  );
}
