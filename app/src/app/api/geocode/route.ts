/**
 * Place search — `GET /api/geocode?q=…`.
 *
 * Auth-gated by middleware.ts. Powers the `LocationField` picker: it merges
 * results from the configured self-hosted geocoder (when `GEOCODER_URL` is set,
 * see lib/geocode.ts) with places already used in the archive, so the picker is
 * useful even with no geocoder at all. Returns `{ suggestions: LocationSuggestion[] }`.
 */
import { NextResponse } from "next/server";
import type { LocationSuggestion, LocationValue } from "@family-archive/ui";
import { getDb } from "@/db/client";
import { residence, person, event } from "@/db/schema";
import { geocode } from "@/lib/geocode";
import { archivePlaceSuggestions, locationFromColumns } from "@/lib/locations";

export const dynamic = "force-dynamic";

/** Distinct archive places (residencies + person/event places) matching `q`. */
async function archiveMatches(q: string): Promise<LocationSuggestion[]> {
  const db = await getDb();
  const [resRows, personRows, eventRows] = await Promise.all([
    db
      .select({
        country: residence.country,
        region: residence.region,
        locality: residence.locality,
        address: residence.address,
        placeLabel: residence.placeLabel,
        lat: residence.lat,
        lng: residence.lng,
        placeId: residence.placeId,
      })
      .from(residence),
    db.select({ born: person.bornPlace, died: person.diedPlace }).from(person),
    db.select({ place: event.place }).from(event),
  ]);

  const residences: LocationValue[] = resRows.map((r) => locationFromColumns(r));
  const labels = [
    ...personRows.flatMap((p) => [p.born, p.died]),
    ...eventRows.map((e) => e.place),
  ];
  const all = archivePlaceSuggestions({ residences, labels });
  const needle = q.toLowerCase();
  return all.filter((s) => s.label.toLowerCase().includes(needle));
}

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  // Geocoder + archive in parallel; geocoder failures degrade to archive-only.
  const [remote, local] = await Promise.all([
    geocode(q).catch(() => [] as LocationSuggestion[]),
    archiveMatches(q).catch(() => [] as LocationSuggestion[]),
  ]);

  // Archive places first (they're "ours"), then geocoder results; de-dupe by label.
  const seen = new Set<string>();
  const suggestions: LocationSuggestion[] = [];
  for (const s of [...local, ...remote]) {
    const key = s.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(s);
  }
  return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
}
