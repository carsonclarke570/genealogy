import { ClickableCard, Avatar, Badge } from "@family-archive/ui";

const inner: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, padding: 16 };
const name: React.CSSProperties = { fontFamily: "var(--font-serif)", fontSize: "var(--text-title)", color: "var(--color-ink)" };
const meta: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: "var(--text-body-sm)", color: "var(--color-muted)", fontFeatureSettings: '"tnum" 1' };

// A whole record summary that's one keyboard-and-pointer target — the card
// raises on hover and fires `onOpen` when activated.
export function PersonSummary() {
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 380, padding: 8 }}>
      <ClickableCard ariaLabel="Open Eleanor Whitfield" onOpen={() => {}}>
        <div style={inner}>
          <Avatar name="Eleanor Whitfield" size="lg" />
          <div style={{ display: "grid", gap: 2 }}>
            <span style={name}>Eleanor Whitfield</span>
            <span style={meta}>1888 – 1971 · Cork → Boston</span>
          </div>
        </div>
      </ClickableCard>
      <ClickableCard ariaLabel="Open Thomas Reardon" onOpen={() => {}}>
        <div style={inner}>
          <Avatar name="Thomas Reardon" size="lg" />
          <div style={{ display: "grid", gap: 4 }}>
            <span style={name}>Thomas Reardon</span>
            <span style={meta}>1885 – 1959</span>
            <span><Badge tone="success">3 documents</Badge></span>
          </div>
        </div>
      </ClickableCard>
    </div>
  );
}
