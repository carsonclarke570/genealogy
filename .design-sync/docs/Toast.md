---
category: Feedback & Overlays
---

Toast — transient feedback for an action (saved, uploaded, deleted, failed).

The visual unit only; an app-level viewport stacks and times these (position
with `--z-toast`). `danger`/`warning` use `role="alert"`; others `role="status"`.
Pairs with Dialog for confirm-then-confirm flows.

@example
<Toast tone="success" title="Saved" onDismiss={dismiss}>Eleanor’s record was updated.</Toast>
<Toast tone="danger" title="Upload failed">The file was larger than 25 MB.</Toast>

## Props

```ts
interface ToastProps {
  /** Semantic tone — sets the icon colour. */
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  /** Short bold headline. */
  title?: React.ReactNode;
  /** The message body. */
  children?: React.ReactNode;
  /** Show a dismiss button wired to this handler. */
  onDismiss?: () => void;
  /** Override the default tone icon. */
  icon?: React.ReactNode;
}
```

## Related

`ToastViewport`
