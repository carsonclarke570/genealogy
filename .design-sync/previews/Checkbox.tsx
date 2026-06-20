import { Checkbox } from "@family-archive/ui";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12, width: 340 };

export function Default() {
  return (
    <div style={col}>
      <Checkbox label="Living person" description="Hides sensitive details from shared views" defaultChecked />
      <Checkbox label="Include in exports" />
    </div>
  );
}

export function Group() {
  return (
    <div style={col}>
      <Checkbox label="Photos" defaultChecked />
      <Checkbox label="Certificates" defaultChecked />
      <Checkbox label="Articles" />
      <Checkbox label="Obituaries" disabled />
    </div>
  );
}
