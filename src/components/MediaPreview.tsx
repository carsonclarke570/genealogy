import type { CSSProperties, ReactNode } from "react";

export type MediaPreviewVariant = "thumb" | "detail";

export interface MediaPreviewProps {
  /** Resolved URL to the file, or null/undefined when there's no stored file. */
  src?: string | null;
  /** The file's MIME type — decides image vs PDF vs placeholder. */
  mimeType?: string | null;
  /** Alt text for an image preview. */
  alt: string;
  /**
   * `thumb` fills its box (cover) and shows the placeholder for anything that
   * isn't an image; `detail` letterboxes the image (contain) and embeds PDFs.
   * @default "detail"
   */
  variant?: MediaPreviewVariant;
  /** What to show when there's no displayable image (e.g. a "PDF document" label). */
  placeholder?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const isImage = (mime?: string | null) => Boolean(mime && mime.startsWith("image/"));

/**
 * MediaPreview — the shared image / PDF / placeholder renderer.
 *
 * One place to decide how an archived file shows up, so a gallery tile and a
 * detail dialog never drift: an image renders inline, a PDF embeds in `detail`
 * (and falls back to a label in `thumb`), and anything fileless lands on the
 * placeholder. Pass the resolved `src` and a `placeholder` node — it stays
 * agnostic about how URLs or labels are produced.
 */
export function MediaPreview({
  src,
  mimeType,
  alt,
  variant = "detail",
  placeholder,
  className,
  style,
}: MediaPreviewProps) {
  if (src && isImage(mimeType)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={["fa-mediaprev", `fa-mediaprev--${variant}`, className].filter(Boolean).join(" ")}
        style={style}
      />
    );
  }

  if (variant === "detail" && src && mimeType === "application/pdf") {
    return (
      <object data={src} type="application/pdf" className="fa-mediaprev__pdf" style={style}>
        <div className="fa-mediaprev__ph" style={{ height: 200 }}>
          <a href={src} target="_blank" rel="noreferrer">
            Open PDF
          </a>
        </div>
      </object>
    );
  }

  return (
    <div
      className={["fa-mediaprev__ph", `fa-mediaprev__ph--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {placeholder}
    </div>
  );
}
