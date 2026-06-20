import { Badge } from "@family-archive/ui";

const row: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

export function Tones() {
  return (
    <div style={row}>
      <Badge tone="neutral">Draft</Badge>
      <Badge tone="info">3 documents</Badge>
      <Badge tone="success">Verified</Badge>
      <Badge tone="warning">No source</Badge>
      <Badge tone="danger">Conflicting dates</Badge>
    </div>
  );
}

export function WithDot() {
  return (
    <div style={row}>
      <Badge tone="success" dot>Verified</Badge>
      <Badge tone="warning" dot>Unverified</Badge>
      <Badge tone="danger" dot>Disputed</Badge>
    </div>
  );
}
