import { useState } from "react";
import { MultiCombobox, Avatar } from "@family-archive/ui";

const PEOPLE = [
  { value: "eleanor", label: "Eleanor Whitfield", description: "1888–1971" },
  { value: "thomas", label: "Thomas Reardon", description: "1885–1959" },
  { value: "margaret", label: "Margaret Reardon", description: "1914–2003" },
  { value: "james", label: "James Reardon", description: "1916–1988" },
  { value: "alice", label: "Alice Whitfield", description: "1890–1979" },
];
const withAvatars = PEOPLE.map((p) => ({ ...p, leading: <Avatar name={p.label} size="sm" /> }));

// Reserve room so the open (absolute) panel is captured in-card.
const stage: React.CSSProperties = { paddingBottom: 300, maxWidth: 460 };
const closed: React.CSSProperties = { maxWidth: 460, padding: 8 };

// Tagging several people onto one fact — selected chips above, the open list
// below.
export function TagPeople() {
  const [value, setValue] = useState<string[]>(["eleanor", "margaret"]);
  return (
    <div style={stage}>
      <MultiCombobox
        open
        label="People on this document"
        placeholder="Search people…"
        value={value}
        onChange={setValue}
        options={withAvatars}
      />
    </div>
  );
}

// Resting with a few selected.
export function Selected() {
  const [value, setValue] = useState<string[]>(["eleanor", "thomas", "james"]);
  return (
    <div style={closed}>
      <MultiCombobox
        label="Witnesses"
        placeholder="Search people…"
        value={value}
        onChange={setValue}
        options={withAvatars}
      />
    </div>
  );
}

// Empty, with a hint.
export function Empty() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={closed}>
      <MultiCombobox
        label="Children"
        hint="Add everyone recorded on the census household."
        placeholder="Search people…"
        value={value}
        onChange={setValue}
        options={withAvatars}
      />
    </div>
  );
}

// Required and invalid.
export function WithError() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={closed}>
      <MultiCombobox
        label="Parents"
        required
        error="Add at least one recorded parent"
        placeholder="Search people…"
        value={value}
        onChange={setValue}
        options={withAvatars}
      />
    </div>
  );
}
