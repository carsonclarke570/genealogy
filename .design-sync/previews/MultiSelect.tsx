import { useState } from "react";
import { MultiSelect, Avatar } from "@family-archive/ui";

// Reserve vertical room so the open (absolute) popover is captured in-card.
const stage: React.CSSProperties = { paddingBottom: 320 };

const PEOPLE = [
  { value: "eleanor", label: "Eleanor Whitfield", description: "1888–1971" },
  { value: "thomas", label: "Thomas Reardon", description: "1885–1959" },
  { value: "margaret", label: "Margaret Reardon", description: "1914–2003" },
  { value: "james", label: "James Reardon", description: "1916–1988" },
];

export function FilterByPerson() {
  const [selected, setSelected] = useState<string[]>(["eleanor", "margaret"]);
  return (
    <div style={stage}>
      <MultiSelect
        open
        label="Filter by person"
        placeholder="Everyone"
        summary={(n) => `${n} selected`}
        selected={selected}
        onChange={setSelected}
        options={PEOPLE.map((p) => ({
          ...p,
          leading: <Avatar name={p.label} size="sm" />,
        }))}
      />
    </div>
  );
}

export function Closed() {
  const [selected, setSelected] = useState<string[]>(["eleanor", "margaret", "james"]);
  return (
    <MultiSelect
      label="People"
      placeholder="Everyone"
      selected={selected}
      onChange={setSelected}
      options={PEOPLE}
    />
  );
}
