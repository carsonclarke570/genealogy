"use client";

import { useRef, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";

export type FileDropzoneShape = "rect" | "round";

export interface FileDropzoneProps {
  /** The affordance content — typically an upload glyph + a short label. */
  children: ReactNode;
  /** Called with the first chosen/dropped file. */
  onFile?: (file: File) => void;
  /** Called with every chosen/dropped file (pair with `multiple`). */
  onFiles?: (files: File[]) => void;
  /** MIME accept list for the native picker (e.g. "image/png,application/pdf"). */
  accept?: string;
  /** Allow selecting more than one file. @default false */
  multiple?: boolean;
  disabled?: boolean;
  /** `round` crops to a circle for a portrait drop target. @default "rect" */
  shape?: FileDropzoneShape;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

/**
 * FileDropzone — a dashed drop target that doubles as a click-to-browse button.
 *
 * Owns only the affordance and the file plumbing (a hidden picker, drag-over
 * highlight, and drop handling); it deliberately does **no** validation — wire
 * an `onFile`/`onFiles` handler that checks type and size and surfaces its own
 * error, so each form keeps its own rules. Pass the glyph + label as children
 * (the library ships no icon set). With no handler it renders as a static,
 * non-interactive placeholder.
 *
 * @example
 * <FileDropzone accept="image/*,application/pdf" onFile={chooseFile} aria-label="Upload a file">
 *   <UploadIcon />
 *   <span>Drop a file or click to browse</span>
 * </FileDropzone>
 */
export function FileDropzone({
  children,
  onFile,
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  shape = "rect",
  className,
  style,
  "aria-label": ariaLabel,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const interactive = Boolean(onFile || onFiles) && !disabled;

  const emit = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    onFiles?.(files);
    if (onFile && files[0]) onFile(files[0]);
  };

  const classes = [
    "fa-dropzone",
    shape === "round" && "fa-dropzone--round",
    over && "fa-dropzone--over",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOver(false);
    emit(e.dataTransfer.files);
  };

  return (
    <>
      {interactive && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={(e) => {
            emit(e.target.files);
            // Reset so re-picking the same file still fires onChange.
            e.target.value = "";
          }}
        />
      )}
      <button
        type="button"
        className={classes}
        style={style}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={interactive ? () => inputRef.current?.click() : undefined}
        onDragOver={interactive ? (e) => { e.preventDefault(); setOver(true); } : undefined}
        onDragLeave={interactive ? () => setOver(false) : undefined}
        onDrop={interactive ? onDrop : undefined}
      >
        {children}
      </button>
    </>
  );
}
