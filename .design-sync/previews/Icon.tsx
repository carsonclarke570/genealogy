import { Icon, GLYPHS } from "@family-archive/ui";

const CHROME: (keyof typeof GLYPHS)[] = [
  "search", "plus", "edit", "close", "check", "dots",
  "zoomIn", "zoomOut", "recenter", "chevron", "upload", "download",
  "trash", "file", "link", "pin", "calendar", "clock", "sliders", "sun", "moon",
];

const LIFE: (keyof typeof GLYPHS)[] = [
  "birth", "death", "heart", "divorce", "ship", "home",
  "church", "cap", "briefcase", "shield", "ring", "alert",
];

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
  gap: 4,
};
const cell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "12px 4px",
  borderRadius: "var(--radius-md)",
  color: "var(--color-ink)",
};
const cap: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--color-muted)",
};
const heading: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-label)",
  fontWeight: 500,
  color: "var(--color-muted)",
  margin: "4px 2px 8px",
};

function Sheet({ names }: { names: (keyof typeof GLYPHS)[] }) {
  return (
    <div style={grid}>
      {names.map((n) => (
        <div key={n} style={cell}>
          <Icon name={n} size={22} aria-label={n} />
          <span style={cap}>{n}</span>
        </div>
      ))}
    </div>
  );
}

// The whole shared glyph set — chrome controls plus the life-event marks a
// genealogy app draws. Single-path, 24×24, stroke-based.
export function Library() {
  return (
    <div style={{ padding: 8 }}>
      <div style={heading}>Interface</div>
      <Sheet names={CHROME} />
      <div style={{ ...heading, marginTop: 20 }}>Life events</div>
      <Sheet names={LIFE} />
    </div>
  );
}

// One glyph drawn at the sizes the UI actually uses.
export function Sizes() {
  const row: React.CSSProperties = { display: "flex", alignItems: "flex-end", gap: 24, padding: 16, color: "var(--color-ink)" };
  return (
    <div style={row}>
      {[16, 20, 28, 40].map((s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Icon name="pin" size={s} aria-label={`pin ${s}px`} />
          <span style={cap}>{s}px</span>
        </div>
      ))}
    </div>
  );
}

// `path` renders a consumer's own 24×24 glyph through the same component.
export function CustomPath() {
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: 16, color: "var(--color-primary)" };
  return (
    <div style={row}>
      <Icon path="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" size={28} aria-label="star" />
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-body-sm)", color: "var(--color-muted)" }}>
        Bring your own path for app-specific glyphs.
      </span>
    </div>
  );
}
