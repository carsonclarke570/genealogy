/**
 * Provenance confidence levels — the single source of truth shared by the read
 * model (lib/queries.ts validates stored `prov` JSON against this) and the write
 * path (lib/actions.ts validates submitted `prov` against the same tuple). Mirrors
 * the `ProvenanceStatus` union exported by the design system.
 */
export const provStatuses = ["verified", "unverified", "estimated", "disputed"] as const;

export type ProvStatus = (typeof provStatuses)[number];
