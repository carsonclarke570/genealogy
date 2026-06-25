/**
 * Place keys — the pure, dependency-free join between a place *string* and its
 * cached coordinate row in the `place` gazetteer.
 *
 * Births, deaths and event places are bare text. To dedupe them to one
 * coordinate each, every label is reduced to a canonical `normalized` key
 * (lowercased, whitespace-collapsed) and hashed to a stable id. This module is
 * imported by the server write path (actions.ts), the resolver (places.ts) and
 * the pure map derivation (map-journey.ts) alike, so it must stay free of any
 * server-only / DB imports.
 */

/** Canonical join key for a place label: lowercased, trimmed, whitespace-collapsed. */
export function normalizePlace(label: string | null | undefined): string {
  return (label ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Deterministic 32-bit FNV-1a hash of a string (stable across runs). */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable gazetteer row id derived from the normalised key (`P-<hash>`). */
export function placeKeyId(normalized: string): string {
  return `P-${hashStr(normalized).toString(16)}`;
}
