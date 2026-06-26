---
category: Data Display
---

DocViewer — a zoom / pan / rotate stage for inspecting a document.

Drag to pan, scroll (or the toolbar) to zoom, rotate in 90° steps, and "fit" to
reset. The content is whatever you pass as `children` — an `<img>`, an embedded
PDF, a rendered certificate — so the viewport stays agnostic about what it's
showing. The floating toolbar reports the current zoom and resets it on click.
Pass `resetKey` (the file's id or URL) so the transform clears when the document
changes. The viewer fills its (positioned) container; give it a sized,
relatively-positioned parent.

@example
<DocViewer resetKey={file.id} aria-label={file.name}>
  <img src={file.url} alt={file.name} className="fa-docviewer__img" draggable={false} />
</DocViewer>

## Props

```ts
interface DocViewerProps {
  /** The document to inspect — an image, an embedded PDF, a rendered scan. */
  children: React.ReactNode;
  /** Identity of the current document. When it changes the transform resets. */
  resetKey?: string | number;
  /** Accessible name for the viewport. @default "Document viewer" */
  "aria-label"?: string;
  className?: string;
}
```
