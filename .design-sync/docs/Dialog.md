---
category: Feedback & Overlays
---

Dialog — a modal for focused, interrupting tasks (confirm delete, upload).

Reach for inline/progressive UI first; use a modal only when the task must
interrupt. Renders a scrim (`--color-backdrop`) over the page with a centered
panel. Closes on Escape, backdrop click, or the close button. Labelled via
`aria-labelledby`/`aria-describedby`; `role="dialog"` + `aria-modal`.

@example
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Delete this record?"
  description="This removes Eleanor Whitfield and detaches her 3 documents."
  footer={<>
    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    <Button variant="danger" onClick={confirm}>Delete</Button>
  </>}
/>

## Props

```ts
interface DialogProps {
  /** Whether the dialog is shown. */
  open: boolean;
  /** Called on backdrop click, the close button, or Escape. */
  onClose: () => void;
  /** Dialog title (sans, not the serif). */
  title: React.ReactNode;
  /** Optional supporting line beneath the title. */
  description?: React.ReactNode;
  /** Footer actions, right-aligned (e.g. a Cancel ghost + a primary Button). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}
```
