import { AvatarStack } from "@family-archive/ui";

const HOUSEHOLD = [
  { name: "Eleanor Whitfield" },
  { name: "Thomas Reardon" },
  { name: "Margaret Reardon" },
  { name: "James Reardon" },
  { name: "Alice Whitfield" },
];

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: 8 };
const label: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: "var(--text-body-sm)", color: "var(--color-muted)" };
const stack: React.CSSProperties = { display: "grid", gap: 18, padding: 8 };

// The people on a shared fact — a census household, a wedding party — clustered
// as overlapping rings with names on hover.
export function Household() {
  return (
    <div style={stack}>
      <div style={row}>
        <AvatarStack items={HOUSEHOLD} />
        <span style={label}>The Reardon household, 1911</span>
      </div>
      <div style={row}>
        <AvatarStack items={HOUSEHOLD.slice(0, 2)} />
        <span style={label}>Eleanor &amp; Thomas, married 1913</span>
      </div>
    </div>
  );
}

// `max` caps the visible avatars; the rest stay in the count.
export function Sizes() {
  return (
    <div style={stack}>
      <div style={row}><AvatarStack items={HOUSEHOLD} size="sm" max={4} /><span style={label}>Small</span></div>
      <div style={row}><AvatarStack items={HOUSEHOLD} size="md" max={4} /><span style={label}>Medium</span></div>
      <div style={row}><AvatarStack items={HOUSEHOLD} size="lg" max={3} /><span style={label}>Large</span></div>
    </div>
  );
}
