import { Button, Card, Badge, Chip } from "@family-archive/ui";

export function Default() {
  return (
    <div style={{ width: 360 }}>
      <Card title="Biography">
        <p className="prose" style={{ margin: 0, color: "var(--color-ink)" }}>
          Eleanor was born in Cork in 1888, the eldest of five. She emigrated to
          Boston in 1910 and worked as a seamstress before marrying Thomas
          Reardon in 1913.
        </p>
      </Card>
    </div>
  );
}

export function WithActions() {
  return (
    <div style={{ width: 360 }}>
      <Card
        title="Documents"
        actions={<Button size="sm" variant="ghost">Add</Button>}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip dot="certificate">Birth certificate</Chip>
          <Chip dot="photo">Wedding photo</Chip>
          <Chip dot="obituary">Obituary</Chip>
        </div>
      </Card>
    </div>
  );
}

export function Plain() {
  return (
    <div style={{ width: 360 }}>
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ color: "var(--color-muted)" }}>Records on file</span>
          <Badge tone="info">12 people</Badge>
        </div>
      </Card>
    </div>
  );
}
