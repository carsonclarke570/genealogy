/**
 * Deterministic ids for the records a Census media item generates. Kept in their
 * own module (no "server-only") so client components — the media edit dialog needs
 * to find a census's residence to pre-fill its location — can import them too. The
 * server-side generation/sync lives in census.ts, which re-exports these.
 */

/** Deterministic id of the residence derived from a census media item. */
export const censusResidenceId = (mediaId: string): string => `R-census-${mediaId}`;
/** Deterministic id of the event derived from a census media item. */
export const censusEventId = (mediaId: string): string => `E-census-${mediaId}`;
