import { Chip } from "@family-archive/ui";

const row: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };

export function DocumentTypes() {
  return (
    <div style={row}>
      <Chip dot="photo">Photo</Chip>
      <Chip dot="certificate">Certificate</Chip>
      <Chip dot="article">Article</Chip>
      <Chip dot="obituary">Obituary</Chip>
      <Chip dot="other">Other</Chip>
    </div>
  );
}

export function Filters() {
  return (
    <div style={row}>
      <Chip selected onClick={() => {}}>Photos</Chip>
      <Chip onClick={() => {}}>Certificates</Chip>
      <Chip onClick={() => {}}>Articles</Chip>
      <Chip onClick={() => {}}>Obituaries</Chip>
    </div>
  );
}

export function Plain() {
  return (
    <div style={row}>
      <Chip>Maternal line</Chip>
      <Chip>Living</Chip>
      <Chip>Immigrant</Chip>
    </div>
  );
}
