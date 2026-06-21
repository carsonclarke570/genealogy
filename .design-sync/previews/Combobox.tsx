import { useState } from "react";
import { Combobox, Avatar } from "@family-archive/ui";

const PEOPLE = [
  { value: "eleanor", label: "Eleanor Whitfield", description: "1888–1971" },
  { value: "thomas", label: "Thomas Reardon", description: "1885–1959" },
  { value: "margaret", label: "Margaret Reardon", description: "1914–2003" },
  { value: "james", label: "James Reardon", description: "1916–1988" },
  { value: "alice", label: "Alice Whitfield", description: "1890–1979" },
];

const withAvatars = PEOPLE.map((p) => ({
  ...p,
  leading: <Avatar name={p.label} size="sm" />,
}));

// Reserve vertical room so the open (absolute) panel is captured in-card.
const stage: React.CSSProperties = { paddingBottom: 280 };

export function PickRelative() {
  const [value, setValue] = useState<string | null>("margaret");
  return (
    <div style={stage}>
      <Combobox
        open
        label="Relative"
        placeholder="Search people…"
        value={value}
        onChange={setValue}
        options={withAvatars}
      />
    </div>
  );
}

export function Selected() {
  const [value, setValue] = useState<string | null>("eleanor");
  return (
    <Combobox
      label="Spouse"
      placeholder="Search people…"
      value={value}
      onChange={setValue}
      options={withAvatars}
    />
  );
}

export function Empty() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Combobox
      label="Parent"
      hint="Start typing a name to connect this person to the tree."
      placeholder="Search people…"
      value={value}
      onChange={setValue}
      options={withAvatars}
    />
  );
}

export function WithError() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Combobox
      label="Relative"
      required
      error="Choose someone already in the tree"
      placeholder="Search people…"
      value={value}
      onChange={setValue}
      options={withAvatars}
    />
  );
}
