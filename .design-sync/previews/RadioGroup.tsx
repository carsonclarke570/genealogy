import { RadioGroup } from "@family-archive/ui";

const box: React.CSSProperties = { width: 340 };

export function Relationship() {
  return (
    <div style={box}>
      <RadioGroup
        legend="Relationship"
        defaultValue="parent"
        options={[
          { value: "parent", label: "Parent" },
          { value: "child", label: "Child" },
          { value: "spouse", label: "Spouse / partner" },
        ]}
      />
    </div>
  );
}

export function Visibility() {
  return (
    <div style={box}>
      <RadioGroup
        legend="Who can see this record"
        defaultValue="family"
        options={[
          { value: "private", label: "Only me", description: "Visible to the curator alone" },
          { value: "family", label: "Family", description: "Anyone signed in to this archive" },
          { value: "public", label: "Public link", description: "Anyone with the link", disabled: true },
        ]}
      />
    </div>
  );
}
