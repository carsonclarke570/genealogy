import { Tooltip, Button } from "@family-archive/ui";

// Tooltips reveal on hover/focus; force `open` so the bubble renders statically.
// The wrapper reserves room above so the bubble isn't clipped at the card top.
const stage: React.CSSProperties = {
  paddingTop: 44,
  paddingBottom: 8,
  width: 260,
  display: "flex",
  justifyContent: "center",
};

export function OnButton() {
  return (
    <div style={stage}>
      <Tooltip label="Has 3 attached documents" open>
        <Button variant="ghost" aria-label="Documents">Documents</Button>
      </Tooltip>
    </div>
  );
}

export function OnIconButton() {
  return (
    <div style={stage}>
      <Tooltip label="Verified source" open>
        <Button variant="secondary" size="sm" aria-label="Verified">✓</Button>
      </Tooltip>
    </div>
  );
}
