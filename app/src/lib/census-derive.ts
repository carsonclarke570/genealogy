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
  /**
   * Where the household lived, per the census. Optional: with a place we also
   * generate a residence; without one only the census event is generated.
   */
  location: LocationValue | null;
  /** Confidence carried over from the media item. */
  prov: ProvStatus;
}

/**
 * The records a census media item generates. Pure — given the same source it
 * always returns the same rows (same ids, same values). The **event** is always
 * generated; the **residence** only when a place is known (else `null`) — a census
 * with no recorded place still marks that the household appeared in it. The
 * residence is a "point" (a census places a household at a year, not a span).
 */
export function buildCensusRows(src: CensusSource): {
  residence: typeof residence.$inferInsert | null;
  event: typeof event.$inferInsert;
} {
  const dateStr = src.year != null ? String(src.year) : null;
  const loc = src.location ? locationToColumns(src.location) : null;
  const placeLabel = loc?.placeLabel ?? null;

  return {
    residence: loc
      ? {
          id: censusResidenceId(src.mediaId),
          country: loc.country,
          region: loc.region,
          locality: loc.locality,
          address: loc.address,
          placeLabel: loc.placeLabel,
          lat: loc.lat,
          lng: loc.lng,
          placeId: loc.placeId,
          dateKind: "point",
          startDate: dateStr,
          startYear: src.year,
          endDate: null,
          endYear: null,
          prov: src.prov,
          mediaId: src.mediaId,
          note: null,
          autoManaged: true,
        }
      : null,
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
