import { Skeleton } from "@family-archive/ui";

// A person-card placeholder mirrors PersonNode's shape (avatar + two lines).
export function PersonCard() {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        width: 240,
        padding: "0.75rem 1rem",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg)",
      }}
    >
      <Skeleton variant="circle" width={40} height={40} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="45%" />
      </div>
    </div>
  );
}

export function Lines() {
  return (
    <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 6 }}>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="92%" />
      <Skeleton variant="text" width="70%" />
    </div>
  );
}

export function Tile() {
  return <Skeleton width={160} height={120} />;
}
