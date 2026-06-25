import { useState } from "react";
import { LocationField } from "@family-archive/ui";
import type { LocationValue } from "@family-archive/ui";

const CORK: LocationValue = {
  label: "Cork, Ireland",
  country: "Ireland",
  region: "County Cork",
  locality: "Cork",
  lat: 51.8985,
  lng: -8.4756,
};

// Places already used in the archive — shown when the field is empty and
// filtered as the user types, so the picker is useful with no geocoder at all.
const ARCHIVE = [
  { id: "cork", ...CORK },
  { id: "boston", label: "Boston, MA", country: "United States", region: "Massachusetts", locality: "Boston" },
  { id: "ellis", label: "Ellis Island, New York", country: "United States", region: "New York" },
];

const stage: React.CSSProperties = { maxWidth: 460, padding: 8 };

// A chosen place.
export function Selected() {
  const [value, setValue] = useState<LocationValue | null>(CORK);
  return (
    <div style={stage}>
      <LocationField label="Birthplace" value={value} onChange={setValue} suggestions={ARCHIVE} placeholder="Town, country…" />
    </div>
  );
}

// Empty, with a hint.
export function Empty() {
  const [value, setValue] = useState<LocationValue | null>(null);
  return (
    <div style={stage}>
      <LocationField
        label="Place of death"
        hint="Search the archive's places, or type a new one."
        value={value}
        onChange={setValue}
        suggestions={ARCHIVE}
        placeholder="Town, country…"
      />
    </div>
  );
}

// Required and invalid.
export function Required() {
  const [value, setValue] = useState<LocationValue | null>(null);
  return (
    <div style={stage}>
      <LocationField
        label="Residence"
        required
        error="A place is required for a residence span"
        value={value}
        onChange={setValue}
        suggestions={ARCHIVE}
        placeholder="Town, country…"
      />
    </div>
  );
}
