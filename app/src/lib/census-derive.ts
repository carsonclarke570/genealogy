/**
 * Pure builder for the rows a Census media item generates — no DB, no
 * "server-only", so it's unit-testable in isolation (census.test.ts) and shared by
 * the server-side sync in census.ts. See census.ts for the orchestration.
 */
import { residence, event } from "@/db/schema";
import { locationToColumns, type LocationValue } from "./locations";
import { censusResidenceId, censusEventId } from "./census-ids";
import type { ProvStatus } from "./prov";

export { censusResidenceId, censusEventId } from "./census-ids";

export interface CensusSource {
  mediaId: string;
  /** The census year (the media item's `year`), or null when undated. */
  year: number | null;
  /** Where the household lived, per the census. */
  location: LocationValue;
  /** Confidence carried over from the media item. */
  prov: ProvStatus;
}

/**
 * The residence + event rows a census media item generates. Pure — given the same
 * source it always returns the same rows (same ids, same values). The residence is
 * a "point" (a census places a household at a year, not across a move-in/out span).
 */
export function buildCensusRows(src: CensusSource): {
  residence: typeof residence.$inferInsert;
  event: typeof event.$inferInsert;
} {
  const dateStr = src.year != null ? String(src.year) : null;
  const loc = locationToColumns(src.location);
  const placeLabel = loc?.placeLabel ?? src.location.label;

  return {
    residence: {
      id: censusResidenceId(src.mediaId),
      country: loc?.country ?? null,
      region: loc?.region ?? null,
      locality: loc?.locality ?? null,
      address: loc?.address ?? null,
      placeLabel,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      placeId: loc?.placeId ?? null,
      dateKind: "point",
      startDate: dateStr,
      startYear: src.year,
      endDate: null,
      endYear: null,
      prov: src.prov,
      mediaId: src.mediaId,
      note: null,
      autoManaged: true,
    },
    event: {
      id: censusEventId(src.mediaId),
      type: "census",
      title: src.year != null ? `${src.year} Census` : "Census record",
      date: dateStr,
      year: src.year,
      place: placeLabel,
      prov: src.prov,
      mediaId: src.mediaId,
      autoManaged: true,
    },
  };
}
