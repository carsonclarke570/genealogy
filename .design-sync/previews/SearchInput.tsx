import { useState } from "react";
import { SearchInput } from "@family-archive/ui";

const stage: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, maxWidth: 420 };
const cap: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: "var(--text-label)", color: "var(--color-muted)" };

// Typing a query — the clear button shows once there's text.
export function WithQuery() {
  const [q, setQ] = useState("Whitfield");
  return (
    <div style={stage}>
      <span style={cap}>Search the archive</span>
      <SearchInput value={q} onChange={setQ} placeholder="Search people, places, documents…" aria-label="Search the archive" />
    </div>
  );
}

// Resting, nothing typed yet.
export function Empty() {
  const [q, setQ] = useState("");
  return (
    <div style={stage}>
      <SearchInput value={q} onChange={setQ} placeholder="Search people, places, documents…" aria-label="Search the archive" />
    </div>
  );
}

// A query in flight swaps the clear button for a spinner.
export function Loading() {
  const [q, setQ] = useState("Cork, Ireland");
  return (
    <div style={stage}>
      <span style={cap}>Searching…</span>
      <SearchInput value={q} onChange={setQ} loading placeholder="Search…" aria-label="Search the archive" />
    </div>
  );
}
