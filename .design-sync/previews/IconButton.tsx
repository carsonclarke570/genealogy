import { IconButton, Icon } from "@family-archive/ui";

const bar: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: 6,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
};

// The icon-only controls that line a toolbar — each carries a required
// aria-label since there's no visible text.
export function MapToolbar() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 12 }}>
      <div style={bar}>
        <IconButton aria-label="Zoom in"><Icon name="zoomIn" /></IconButton>
        <IconButton aria-label="Zoom out"><Icon name="zoomOut" /></IconButton>
        <IconButton aria-label="Re-center"><Icon name="recenter" /></IconButton>
      </div>
      <div style={bar}>
        <IconButton aria-label="Edit record"><Icon name="edit" /></IconButton>
        <IconButton aria-label="More actions"><Icon name="dots" /></IconButton>
        <IconButton aria-label="Close"><Icon name="close" /></IconButton>
      </div>
    </div>
  );
}

// On its own — a single dismiss affordance.
export function Single() {
  return (
    <div style={{ padding: 16 }}>
      <IconButton aria-label="Dismiss"><Icon name="close" size={18} /></IconButton>
    </div>
  );
}
