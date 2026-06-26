---
category: Feedback & Overlays
---

Callout — a persistent inline message block.

The quiet counterpart to a Toast: it stays in the layout to explain, confirm, or
warn in place. A full-bordered, tinted box (never a side stripe) with a
tone-coloured icon and ink body text for legibility. Use `title` for a bold lead
line; nest a checkbox, list, or actions as children for an acknowledgement
block. For a live validation error, pass `role="alert"`.

@example
<Callout tone="success">Every change is recorded as <strong>Verified</strong>.</Callout>
<Callout tone="warning" title="2 changes need confirmation" role="alert">…</Callout>

## Props

```ts
type CalloutTone = "neutral" | "info" | "success" | "warning" | "danger";

interface CalloutProps {
  /** Semantic tone — sets the border, tint, and (for the louder tones) a default icon. @default "info" */
  tone?: CalloutTone;
  /** Optional bold heading row above the body. */
  title?: React.ReactNode;
  /** Leading icon. Defaults by tone: a check for success, a warning mark for warning/danger, none for info/neutral. Pass a node to override, or `null` to force-omit. */
  icon?: React.ReactNode;
  /** The message. */
  children: React.ReactNode;
  className?: string;
}
```
