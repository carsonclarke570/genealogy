import { Stepper } from "@family-archive/ui";

// The staged "Upload media" wizard: describe the scan, attribute it to people,
// record what it proves per person, then review.
const steps = [
  { key: "doc", label: "Document" },
  { key: "people", label: "People" },
  { key: "eleanor", label: "Eleanor" },
  { key: "review", label: "Review" },
];

const stage: React.CSSProperties = { width: 440, maxWidth: "100%" };

export function MidFlow() {
  return (
    <div style={stage}>
      <Stepper steps={steps} current={2} furthest={2} onSelect={() => {}} />
    </div>
  );
}

export function FirstStep() {
  return (
    <div style={stage}>
      <Stepper steps={steps} current={0} furthest={0} onSelect={() => {}} />
    </div>
  );
}

export function Backtracked() {
  // Reached Review, then stepped back to People — every visited step is reachable.
  return (
    <div style={stage}>
      <Stepper steps={steps} current={1} furthest={3} onSelect={() => {}} />
    </div>
  );
}
