import { Tabs } from "@family-archive/ui";

const panel: React.CSSProperties = { color: "var(--color-ink)", maxWidth: "44ch" };
const muted: React.CSSProperties = { color: "var(--color-muted)" };

export function Record() {
  return (
    <div style={{ width: 420 }}>
      <Tabs
        defaultValue="overview"
        items={[
          {
            value: "overview",
            label: "Overview",
            content: (
              <p className="prose" style={panel}>
                Eleanor Margaret Whitfield, born Cork 1888, died Boston 1971.
                Eldest of five; emigrated in 1910.
              </p>
            ),
          },
          {
            value: "documents",
            label: "Documents",
            content: <p style={{ ...panel, ...muted }}>3 documents — birth certificate, wedding photo, obituary.</p>,
          },
          {
            value: "relations",
            label: "Relations",
            content: <p style={{ ...panel, ...muted }}>Spouse: Thomas Reardon. 4 children.</p>,
          },
        ]}
      />
    </div>
  );
}

export function WithDisabled() {
  return (
    <div style={{ width: 420 }}>
      <Tabs
        defaultValue="overview"
        items={[
          { value: "overview", label: "Overview", content: <p style={panel}>Active panel.</p> },
          { value: "media", label: "Media", content: <p style={panel}>Media.</p> },
          { value: "sources", label: "Sources", content: <p style={panel}>Sources.</p>, disabled: true },
        ]}
      />
    </div>
  );
}
