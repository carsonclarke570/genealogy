import { PersonRow, Badge, Icon } from "@family-archive/ui";

const stage: React.CSSProperties = { width: 380, maxWidth: "100%", display: "grid", gap: 8 };

// Relationship panel: a leading relationship label before the life-dates.
export function Relationships() {
  return (
    <div style={stage}>
      <PersonRow name="James Whitfield" relation="Father" dates="1888–1971" onClick={() => {}} />
      <PersonRow name="Margaret Whitfield" relation="Mother" dates="1890–1974" onClick={() => {}} />
      <PersonRow name="Eleanor Whitfield" relation="Sister" dates="1915–1998" onClick={() => {}} />
    </div>
  );
}

// Search / document lists: a trailing badge or chevron, md scale for results.
export function WithTrailing() {
  return (
    <div style={stage}>
      <PersonRow
        name="Eleanor Whitfield"
        dates="1915–1998"
        size="md"
        trailing={<Badge tone="info">3 docs</Badge>}
        onClick={() => {}}
      />
      <PersonRow name="Thomas Reardon" dates="1885–1959" trailing={<Icon name="chevron" />} onClick={() => {}} />
    </div>
  );
}

// Family Map: a lineage-coloured dot keys each person to their surname line.
export function WithLineage() {
  return (
    <div style={stage}>
      <PersonRow
        name="Eleanor Whitfield"
        dates="Lanark · 1915"
        accentColor="var(--color-accent)"
        trailing={<Icon name="chevron" size={16} />}
        onClick={() => {}}
      />
      <PersonRow
        name="Thomas Reardon"
        dates="Cork · 1910"
        accentColor="var(--color-success)"
        trailing={<Icon name="chevron" size={16} />}
        onClick={() => {}}
      />
    </div>
  );
}
