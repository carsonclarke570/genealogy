import { DocChip } from "@family-archive/ui";

const row: React.CSSProperties = { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" };
const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };

export function Types() {
  return (
    <div style={row}>
      <DocChip type="photo" />
      <DocChip type="certificate" />
      <DocChip type="article" />
      <DocChip type="obituary" />
      <DocChip type="other" />
    </div>
  );
}

export function WithTitles() {
  return (
    <div style={col}>
      <DocChip type="certificate">Birth certificate, 1888</DocChip>
      <DocChip type="photo">Wedding portrait, 1947</DocChip>
      <DocChip type="obituary">Boston Globe, Mar 1971</DocChip>
    </div>
  );
}
