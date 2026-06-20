import { SourceCiteDialog } from "@family-archive/ui";

const sources = [
  { id: "m1", label: "Eleanor Whitfield — birth certificate", type: "certificate" as const },
  { id: "m2", label: "Whitfield family at the lake house", type: "photo" as const },
  { id: "m3", label: "Thomas E. Whitfield, 1888–1971", type: "obituary" as const },
  { id: "m4", label: "Pvt. Arthur Whitfield, missing in action", type: "article" as const },
];

// The Dialog backdrop is position:fixed; in the single-card harness it would
// resolve against the transformed wrapper, so give it a sized, relatively-
// positioned stage (its own transform makes it the containing block).
const stage: React.CSSProperties = {
  position: "relative",
  transform: "translateZ(0)",
  width: "100%",
  maxWidth: 520,
  height: 440,
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--color-surface)",
};

// The "Link a source" step behind marking a fact verified.
export function LinkSource() {
  return (
    <div style={stage}>
      <SourceCiteDialog open sources={sources} onClose={() => {}} onConfirm={() => {}} />
    </div>
  );
}
