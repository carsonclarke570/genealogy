---
category: Forms
---

FileDropzone — a dashed drop target that doubles as a click-to-browse button.

Owns only the affordance and the file plumbing (a hidden picker, drag-over
highlight, and drop handling); it deliberately does **no** validation — wire
an `onFile` handler that checks type and size and surfaces its own error, so
each form keeps its own rules. Pass the glyph + label as children
(the library ships no icon set). With no handler it renders as a static,
non-interactive placeholder.

@example
<FileDropzone accept="image/*,application/pdf" onFile={chooseFile} aria-label="Upload a file">
  <UploadIcon />
  <span>Drop a file or click to browse</span>
</FileDropzone>

## Props

```ts
interface FileDropzoneProps {
  /** The affordance content — typically an upload glyph + a short label. */
  children: React.ReactNode;
  /** Called with the chosen/dropped file. */
  onFile?: (file: File) => void;
  /** MIME accept list for the native picker (e.g. "image/png,application/pdf"). */
  accept?: string;
  disabled?: boolean;
  /** `round` crops to a circle for a portrait drop target. */
  shape?: "rect" | "round";
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}
```
