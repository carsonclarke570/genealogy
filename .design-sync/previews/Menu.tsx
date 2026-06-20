import { Menu, Button } from "@family-archive/ui";

// Reserve vertical room so the open (absolute) dropdown is captured in-card.
const stage: React.CSSProperties = { paddingBottom: 200, display: "flex" };

const EditIcon = () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11 2.5l2.5 2.5L6 12.5 3 13l.5-3L11 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>);
const TrashIcon = () => (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>);

export function Default() {
  return (
    <div style={stage}>
      <Menu
        open
        trigger={<Button variant="secondary" size="sm">Actions ⌄</Button>}
        items={[
          { label: "Edit record", onSelect: () => {}, icon: <EditIcon /> },
          { label: "Add document", onSelect: () => {} },
          { label: "Share…", onSelect: () => {} },
          "separator",
          { label: "Merge with…", onSelect: () => {} },
          { label: "Delete", danger: true, onSelect: () => {}, icon: <TrashIcon /> },
        ]}
      />
    </div>
  );
}
