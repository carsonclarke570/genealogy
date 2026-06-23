/**
 * Storage <-> UI bridge for structured locations.
 *
 * The design-system `LocationField` works in {@link LocationValue} objects
 * (label + country/region/locality/address parts + optional coordinates). The
 * `residence` table stores those parts as discrete columns; older free-text place
 * fields (born/died/event place) store only the display `label`. These helpers
 * map between the three, and assemble the archive-place suggestion list the
 * picker offers when there's no geocoder (or alongside one).
 */
import type { LocationValue, LocationSuggestion } from "@family-archive/ui";

export type { LocationValue, LocationSuggestion } from "@family-archive/ui";

// NOTE: only *types* are imported from "@family-archive/ui" here. This module is
// used by server code (queries.ts, actions.ts, the geocode route), so importing a
// runtime value would pull the whole client-component barrel into the server
// bundle — hence formatLocation is reimplemented locally (kept in sync with the
// design-system version).
/** Compose a one-line display string from a location's parts. */
function composeParts(value: LocationValue): string {
  const parts = [value.address, value.locality, value.region, value.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : value.label.trim();
}

/** The residence-table location columns a {@link LocationValue} maps onto. */
export interface LocationColumns {
  country: string | null;
  region: string | null;
  locality: string | null;
  address: string | null;
  placeLabel: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
}

const clean = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};

/** Best display label for a location: its own label, else its composed parts. */
export function locationLabel(value: LocationValue | null | undefined): string {
  if (!value) return "";
  return value.label.trim() || composeParts(value);
}

/** Map a {@link LocationValue} onto residence-table columns (label required). */
export function locationToColumns(value: LocationValue | null): LocationColumns | null {
  if (!value) return null;
  const label = locationLabel(value);
  if (!label) return null;
  return {
    country: clean(value.country),
    region: clean(value.region),
    locality: clean(value.locality),
    address: clean(value.address),
    placeLabel: label,
    lat: value.lat ?? null,
    lng: value.lng ?? null,
    placeId: clean(value.placeId),
  };
}

/** Rebuild a {@link LocationValue} from residence-table columns. */
export function locationFromColumns(cols: {
  country: string | null;
  region: string | null;
  locality: string | null;
  address: string | null;
  placeLabel: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
}): LocationValue {
  return {
    label: cols.placeLabel,
    country: cols.country,
    region: cols.region,
    locality: cols.locality,
    address: cols.address,
    lat: cols.lat,
    lng: cols.lng,
    placeId: cols.placeId,
  };
}

/** A bare free-text place string → a label-only {@link LocationValue} (or null). */
export function locationFromLabel(label: string | null | undefined): LocationValue | null {
  const t = clean(label);
  return t ? { label: t } : null;
}

/**
 * De-duplicated, sorted suggestion list from places already used in the archive
 * (residencies + free-text person/event places), so the picker offers them even
 * with no geocoder configured. Keyed on the lowercased label.
 */
export function archivePlaceSuggestions(
  inputs: {
    residences?: LocationValue[];
    labels?: (string | null | undefined)[];
  },
): LocationSuggestion[] {
  const byKey = new Map<string, LocationSuggestion>();
  const add = (value: LocationValue | null) => {
    if (!value) return;
    const label = locationLabel(value);
    if (!label) return;
    const key = label.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, { id: `archive:${key}`, ...value, label });
  };
  for (const r of inputs.residences ?? []) add(r);
  for (const l of inputs.labels ?? []) add(locationFromLabel(l));
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
}
