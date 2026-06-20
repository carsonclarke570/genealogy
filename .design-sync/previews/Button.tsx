import { Button } from "@family-archive/ui";

const row: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export function Variants() {
  return (
    <div style={row}>
      <Button variant="primary">Add person</Button>
      <Button variant="secondary">Upload media</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">Delete record</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={row}>
      <Button size="md">Medium</Button>
      <Button size="sm">Small</Button>
      <Button size="sm" variant="secondary">Small secondary</Button>
    </div>
  );
}

export function WithIcon() {
  return (
    <div style={row}>
      <Button variant="primary" iconStart={<PlusIcon />}>Add person</Button>
      <Button variant="secondary" iconStart={<PlusIcon />}>Attach document</Button>
    </div>
  );
}

export function States() {
  return (
    <div style={row}>
      <Button variant="primary" loading>Saving</Button>
      <Button variant="primary" disabled>Disabled</Button>
      <Button variant="secondary" disabled>Disabled</Button>
    </div>
  );
}
