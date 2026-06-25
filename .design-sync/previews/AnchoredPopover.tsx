import { useRef } from "react";
import { AnchoredPopover, Icon } from "@family-archive/ui";

const trigger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "0.5rem 0.75rem",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  font: "inherit",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-label)",
  color: "var(--color-ink)",
  cursor: "pointer",
};
const panel: React.CSSProperties = {
  background: "var(--color-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-overlay-low)",
  padding: 6,
  display: "grid",
  gap: 2,
};
const item: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0.5rem 0.625rem",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-label)",
  color: "var(--color-ink)",
};

// The positioning primitive: a panel portaled to the body and placed against a
// trigger as `position: fixed`, so it escapes any clipping scroll container.
// Open/close stays with the caller; here it's pinned open against the button.
export function BelowTrigger() {
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ padding: 20 }}>
      <button ref={anchor} type="button" style={trigger}>
        Document type
        <Icon name="chevron" size={14} style={{ transform: "rotate(90deg)" }} />
      </button>
      <AnchoredPopover anchorRef={anchor} open width={220} role="listbox" aria-label="Document type">
        <div style={panel}>
          <span style={item}><Icon name="file" size={16} /> Certificate</span>
          <span style={{ ...item, background: "var(--color-primary-tint)" }}><Icon name="check" size={16} /> Photograph</span>
          <span style={item}><Icon name="file" size={16} /> Obituary</span>
          <span style={item}><Icon name="file" size={16} /> Census record</span>
        </div>
      </AnchoredPopover>
    </div>
  );
}
