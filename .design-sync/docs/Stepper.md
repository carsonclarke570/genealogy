---
category: Navigation
---

Stepper — a compact, horizontal progress nav for a multi-step flow (an upload
wizard, a guided form).

Each step is numbered until completed, then shows a check. The active step
carries the sienna fill; completed steps stay navigable (tinted), and any step
past `furthest` is disabled. Labels collapse for upcoming steps so a long flow
stays narrow and scrolls horizontally. Rendered as a `<nav>` of real buttons —
keyboard-focusable, with `aria-current="step"` on the active one.

@example
<Stepper
  steps={[{ key: "doc", label: "Document" }, { key: "people", label: "People" }, { key: "review", label: "Review" }]}
  current={1}
  furthest={1}
  onSelect={setStep}
/>

## Props

```ts
interface StepperProps {
  /** The ordered steps. */
  steps: { key: string; label: React.ReactNode }[];
  /** Index of the active step. */
  current: number;
  /** Highest index the user has reached — every step up to it is navigable. Defaults to `current`. */
  furthest?: number;
  /** Called with a step index when a reachable step is clicked. */
  onSelect?: (index: number) => void;
  className?: string;
}
```
