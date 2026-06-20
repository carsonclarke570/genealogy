import { PersonNode } from "@family-archive/ui";

const col: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "flex-start",
};

const portrait =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>` +
      `<rect width='64' height='64' fill='hsl(20 28% 58%)'/>` +
      `<circle cx='32' cy='26' r='12' fill='hsl(20 22% 80%)'/>` +
      `<rect x='12' y='42' width='40' height='26' rx='13' fill='hsl(20 22% 80%)'/>` +
      `</svg>`
  );

export function States() {
  return (
    <div style={col}>
      <PersonNode name="Eleanor Margaret Whitfield" birth="1888" death="1971" onClick={() => {}} />
      <PersonNode name="Thomas Reardon" birth="1885" death="1959" focused hasDocuments onClick={() => {}} />
      <PersonNode name="Margaret Lynch" birth="1860" death="1921" inPath onClick={() => {}} />
    </div>
  );
}

export function Living() {
  return (
    <div style={col}>
      <PersonNode name="Aoife Reardon" birth="1992" hasDocuments onClick={() => {}} />
      <PersonNode name="Seán Reardon" birth="1959" onClick={() => {}} />
    </div>
  );
}

export function WithPhoto() {
  return (
    <div style={col}>
      <PersonNode
        name="Eleanor Margaret Whitfield"
        birth="1888"
        death="1971"
        photoUrl={portrait}
        hasDocuments
        onClick={() => {}}
      />
    </div>
  );
}
