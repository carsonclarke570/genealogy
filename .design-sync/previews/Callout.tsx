import { Callout, Checkbox } from "@family-archive/ui";

const stage: React.CSSProperties = { width: 480, maxWidth: "100%", display: "grid", gap: 12 };

// The full tone range — the quiet, persistent counterpart to a Toast.
export function Tones() {
  return (
    <div style={stage}>
      <Callout tone="info">
        Facts you record from this document are marked <strong>Verified</strong> and cited to it.
      </Callout>
      <Callout tone="success">
        Every change is recorded as <strong>Verified</strong>, cited to this document.
      </Callout>
      <Callout tone="warning" title="2 changes need your confirmation">
        These changes may cascade across the tree and timeline.
      </Callout>
      <Callout tone="danger" role="alert">
        Give this record a title before continuing.
      </Callout>
      <Callout tone="neutral">A quiet aside with no semantic weight.</Callout>
    </div>
  );
}

// Composed: a warning that carries a list and an acknowledgement checkbox.
export function Acknowledgement() {
  return (
    <div style={{ width: 480, maxWidth: "100%" }}>
      <Callout tone="warning" title="3 changes need your confirmation">
        <div style={{ display: "grid", gap: 8 }}>
          <span>Editing Eleanor's birth year recomputes her age across the timeline.</span>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
            <Checkbox />
            <span>I understand these changes may cascade, and I want to apply them.</span>
          </label>
        </div>
      </Callout>
    </div>
  );
}
