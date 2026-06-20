import { Avatar } from "@family-archive/ui";

const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center" };

// A self-contained portrait (data URI) so the image path renders without network.
const portrait = (hue: number) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>` +
      `<rect width='64' height='64' fill='hsl(${hue} 28% 58%)'/>` +
      `<circle cx='32' cy='26' r='12' fill='hsl(${hue} 22% 78%)'/>` +
      `<rect x='12' y='42' width='40' height='26' rx='13' fill='hsl(${hue} 22% 78%)'/>` +
      `</svg>`
  );

export function Sizes() {
  return (
    <div style={row}>
      <Avatar name="Eleanor Whitfield" size="sm" />
      <Avatar name="Thomas Reardon" size="md" />
      <Avatar name="Margaret Lynch" size="lg" />
    </div>
  );
}

export function WithPhoto() {
  return (
    <div style={row}>
      <Avatar name="Eleanor Whitfield" src={portrait(20)} size="lg" />
      <Avatar name="Thomas Reardon" src={portrait(220)} size="lg" />
    </div>
  );
}

export function Monogram() {
  return (
    <div style={row}>
      <Avatar name="Eleanor Margaret Whitfield" size="lg" />
      <Avatar name="Pádraig" size="lg" />
    </div>
  );
}
