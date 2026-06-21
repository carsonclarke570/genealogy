/**
 * Search endpoint — POST so family-name queries stay out of access-log query
 * strings. Auth is enforced upstream by middleware.ts (the matcher doesn't
 * exclude this path). Returns ranked hits (ids + scores + snippets); the client
 * hydrates names/dates from the Dataset context, keeping the payload small.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { search } from "@/lib/search/query";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  q: z.string().trim().min(1).max(200),
  scope: z.enum(["all", "people", "docs", "places"]).catch("all"),
  limit: z.number().int().min(1).max(50).catch(20),
});

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search request" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await search(db, parsed.data.q, parsed.data.scope, parsed.data.limit);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("Search failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
