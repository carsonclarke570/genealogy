/**
 * Geocoding — turn a typed query into structured {@link LocationSuggestion}s.
 *
 * Self-hosted and env-gated, mirroring the embeddings server: point `GEOCODER_URL`
 * at a Photon instance (Apache-2.0, https://github.com/komoot/photon) and the
 * place picker resolves real country → address results. **No family data is sent
 * to a third party** when self-hosted. When `GEOCODER_URL` is unset (or a request
 * fails), this returns an empty list and the picker degrades to archive-place
 * autocomplete only — so the app stays keyless/serviceless by default, exactly
 * like lexical-only search.
 */
import type { LocationSuggestion } from "@family-archive/ui";

/** Whether a geocoder is configured (so callers can skip the round-trip). */
export function geocoderConfigured(): boolean {
  return Boolean(process.env.GEOCODER_URL);
}

/** A single Photon GeoJSON feature (only the fields we read). */
interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number | string;
    osm_type?: string;
    name?: string;
    country?: string;
    state?: string;
    county?: string;
    city?: string;
    district?: string;
    locality?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
  };
}

function toSuggestion(f: PhotonFeature, idx: number): LocationSuggestion | null {
  const p = f.properties ?? {};
  const name = (p.name ?? "").trim();
  const country = p.country ?? null;
  const region = p.state ?? null;
  const locality = p.city ?? p.locality ?? p.county ?? p.district ?? null;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ").trim();
  const address = street || null;
  // Build a readable label: the feature name first, then the broader context,
  // skipping any part already echoed by the name.
  const context = [locality, region, country]
    .filter((x): x is string => Boolean(x) && x !== name)
    .join(", ");
  const label = name ? (context ? `${name}, ${context}` : name) : context;
  if (!label) return null;
  const coords = f.geometry?.coordinates;
  const id = p.osm_id != null ? `${p.osm_type ?? "osm"}:${p.osm_id}` : `geo:${idx}`;
  return {
    id,
    label,
    country,
    region,
    locality,
    address,
    lat: coords ? coords[1] : null,
    lng: coords ? coords[0] : null,
    placeId: p.osm_id != null ? String(p.osm_id) : null,
  };
}

/**
 * Query the configured geocoder for `query`. Returns up to `limit` suggestions,
 * or `[]` when no geocoder is configured / the request fails / times out.
 */
export async function geocode(query: string, limit = 6): Promise<LocationSuggestion[]> {
  const base = process.env.GEOCODER_URL;
  const q = query.trim();
  if (!base || q.length < 2) return [];

  const url = `${base.replace(/\/$/, "")}/api?q=${encodeURIComponent(q)}&limit=${limit}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const features = Array.isArray(data.features) ? data.features : [];
    const out: LocationSuggestion[] = [];
    features.forEach((f, i) => {
      const s = toSuggestion(f, i);
      if (s) out.push(s);
    });
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
