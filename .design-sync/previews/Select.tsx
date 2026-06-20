import { Select } from "@family-archive/ui";

const field: React.CSSProperties = { width: 300 };

const options = (
  <>
    <option value="photo">Photo</option>
    <option value="certificate">Certificate</option>
    <option value="article">Article</option>
    <option value="obituary">Obituary</option>
    <option value="other">Other</option>
  </>
);

export function Default() {
  return (
    <div style={field}>
      <Select label="Document type" defaultValue="certificate">
        {options}
      </Select>
    </div>
  );
}

export function WithHint() {
  return (
    <div style={field}>
      <Select label="Relationship" hint="How this person connects to the selected record">
        <option value="parent">Parent</option>
        <option value="child">Child</option>
        <option value="spouse">Spouse / partner</option>
      </Select>
    </div>
  );
}

export function Invalid() {
  return (
    <div style={field}>
      <Select label="Document type" error="Choose a document type" defaultValue="">
        <option value="" disabled>Select…</option>
        {options}
      </Select>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={field}>
      <Select label="Document type" disabled defaultValue="certificate">
        {options}
      </Select>
    </div>
  );
}
