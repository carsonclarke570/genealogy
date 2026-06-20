import { Switch } from "@family-archive/ui";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" };

export function States() {
  return (
    <div style={col}>
      <Switch label="Show living relatives" defaultChecked />
      <Switch label="Public link" />
      <Switch label="Locked (admin only)" defaultChecked disabled />
    </div>
  );
}
