import { Accordion, Icon } from "@family-archive/ui";

const stage: React.CSSProperties = { width: 460, maxWidth: "100%" };
const field: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-body-sm)",
  color: "var(--color-ink)",
};
const muted: React.CSSProperties = { ...field, color: "var(--color-muted)" };

// A record's editable sections in the staged upload — one disclosure per part of
// the person's record, with a count of pending changes and a review flag.
export function Open() {
  return (
    <div style={stage}>
      <Accordion title="Life events" icon={<Icon name="calendar" />} count={2} danger defaultOpen>
        <div style={field}>Birth — 2 March 1915, Lanark</div>
        <div style={muted}>Death — recorded from the headstone; differs from the obituary.</div>
      </Accordion>
    </div>
  );
}

export function Collapsed() {
  return (
    <div style={stage}>
      <Accordion title="Relationships" icon={<Icon name="link" />} count={3}>
        <div style={field}>Spouse, parents, and children edited on this document.</div>
      </Accordion>
    </div>
  );
}

export function Quiet() {
  return (
    <div style={stage}>
      <Accordion title="Notes" icon={<Icon name="edit" />}>
        <div style={muted}>No changes recorded for this section.</div>
      </Accordion>
    </div>
  );
}
