import { useState } from "react";
import { Slider } from "@family-archive/ui";

const stage: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, maxWidth: 460, padding: "8px 4px" };
const head: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline" };
const label: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: "var(--text-label)", color: "var(--color-muted)" };
const value: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-body)",
  fontWeight: 500,
  color: "var(--color-ink)",
  fontFeatureSettings: '"tnum" 1',
};

// The Family Map's time scrubber — sweep the year and read it above the track.
export function YearScrubber() {
  const [year, setYear] = useState(1947);
  return (
    <div style={stage}>
      <div style={head}>
        <span style={label}>Year</span>
        <span style={value}>{year}</span>
      </div>
      <Slider value={year} min={1850} max={2000} step={1} onChange={setYear} aria-label="Year" />
    </div>
  );
}

// A coarser range with a larger step.
export function Stepped() {
  const [v, setV] = useState(50);
  return (
    <div style={stage}>
      <div style={head}>
        <span style={label}>Opacity</span>
        <span style={value}>{v}%</span>
      </div>
      <Slider value={v} min={0} max={100} step={10} onChange={setV} aria-label="Opacity" />
    </div>
  );
}

// Disabled — dimmed and non-interactive.
export function Disabled() {
  return (
    <div style={stage}>
      <div style={head}>
        <span style={label}>Locked</span>
        <span style={value}>1900</span>
      </div>
      <Slider value={1900} min={1850} max={2000} disabled aria-label="Locked range" />
    </div>
  );
}
