---
category: Data Display
---

MediaPreview — the shared image / PDF / placeholder renderer.

One place to decide how an archived file shows up, so a gallery tile and a
detail dialog never drift: an image renders inline, a PDF embeds in `detail`
(and falls back to a label in `thumb`), and anything fileless lands on the
placeholder. Pass the resolved `src` and a `placeholder` node — it stays
agnostic about how URLs or labels are produced.

## Props

```ts
interface MediaPreviewProps {
  /** Resolved URL to the file, or null/undefined when there's no stored file. */
  src?: string;
  /** The file's MIME type — decides image vs PDF vs placeholder. */
  mimeType?: string;
  /** Alt text for an image preview. */
  alt: string;
  /** `thumb` fills its box (cover) and shows the placeholder for anything that isn't an image; `detail` letterboxes the image */
  variant?: "thumb" | "detail";
  /** What to show when there's no displayable image (e.g. a "PDF document" label). */
  placeholder?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}
```
