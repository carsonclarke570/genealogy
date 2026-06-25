import { useState } from "react";
import { ProvLocationField } from "@family-archive/ui";
import type { SourceOption, LocationValue, LocationSuggestion } from "@family-archive/ui";

const SOURCES: SourceOption[] = [
  { id: "bc", label: "Birth certificate — Eleanor Whitfield", type: "certificate", year: 1888 },
  { id: "cen", label: "1911 census — Reardon household", type: "census", year: 1911 },
];

const CORK: LocationValue = {
  label: "Cork, Ireland",
  country: "Ireland",
  region: "County Cork",
  locality: "Cork",
  lat: 51.8985,
  lng: -8.4756,
};

// Archive places stand in for a geocoder so the preview is offline-stable.
const PLACES: LocationSuggestion[] = [
  { id: "cork", ...CORK },
  { id: "boston", label: "Boston, MA", country: "United States", region: "Massachusetts", locality: "Boston" },
];
const search = async (q: string): Promise<LocationSuggestion[]> =>
  PLACES.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()));

const stage: React.CSSProperties = { maxWidth: 460, padding: 8 };

// A structured place that still submits a plain label string, with its
// provenance mark on the label.
export function Birthplace() {
  const [value, setValue] = useState<LocationValue | null>(CORK);
  return (
    <div style={stage}>
      <ProvLocationField
        label="Birthplace"
        fieldKey="birthplace"
        value={value}
        onChange={setValue}
        onSearch={search}
        status="verified"
        sources={SOURCES}
        onProvChange={() => {}}
      />
    </div>
  );
}

// Empty and unverified, awaiting a place.
export function Unverified() {
  const [value, setValue] = useState<LocationValue | null>(null);
  return (
    <div style={stage}>
      <ProvLocationField
        label="Place of death"
        placeholder="Search the archive's places, or type a new one."
        fieldKey="deathplace"
        value={value}
        onChange={setValue}
        onSearch={search}
        status="unverified"
        sources={SOURCES}
        onProvChange={() => {}}
      />
    </div>
  );
}
