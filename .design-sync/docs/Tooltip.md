---
category: Feedback & Overlays
---

Tooltip — a small label revealed on hover or keyboard focus of its trigger.

Wrap a focusable trigger (button, icon button). The bubble appears above the
trigger on `:hover` / `:focus-within`; pass `open` to force it. Keep tooltips
to terse, non-essential hints — never the only place critical information lives.

@example
<Tooltip label="Has attached documents">
  <Button variant="ghost" aria-label="Documents">3</Button>
</Tooltip>

## Props

```ts
interface TooltipProps {
  /** The tooltip text. */
  label: React.ReactNode;
  /** Force the tooltip visible (e.g. static previews / controlled use). */
  open?: boolean;
  /** The trigger element the tooltip describes. */
  children: React.ReactNode;
}
```
