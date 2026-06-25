import { FileDropzone, Icon } from "@family-archive/ui";

const dropContent: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  color: "var(--color-muted)",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-body-sm)",
  padding: 28,
};
const strong: React.CSSProperties = { color: "var(--color-ink)", fontWeight: 500 };
const wrap: React.CSSProperties = { display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap", padding: 8 };
const cap: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: "var(--text-label)", color: "var(--color-muted)", marginTop: 8 };

// The default rectangular drop target — a glyph and a one-line instruction.
export function Document() {
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 360, flex: 1 }}>
        <FileDropzone accept="image/*,application/pdf" onFile={() => {}} aria-label="Upload a document">
          <span style={dropContent}>
            <Icon name="upload" size={24} />
            <span><span style={strong}>Click to upload</span> or drop a file</span>
            <span>Photos, certificates, PDFs · up to 25&nbsp;MB</span>
          </span>
        </FileDropzone>
        <div style={cap}>shape="rect" (default)</div>
      </div>
    </div>
  );
}

// `round` crops to a circle for a portrait drop target.
export function Portrait() {
  return (
    <div style={wrap}>
      <div>
        <FileDropzone shape="round" accept="image/*" onFile={() => {}} aria-label="Upload a portrait">
          <span style={{ ...dropContent, padding: 18, gap: 4 }}>
            <Icon name="upload" size={20} />
            <span>Photo</span>
          </span>
        </FileDropzone>
        <div style={cap}>shape="round"</div>
      </div>
    </div>
  );
}

// Disabled — dimmed and non-interactive.
export function Disabled() {
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 360, flex: 1 }}>
        <FileDropzone disabled aria-label="Upload disabled">
          <span style={dropContent}>
            <Icon name="upload" size={24} />
            <span>Uploads are locked for this record</span>
          </span>
        </FileDropzone>
      </div>
    </div>
  );
}
