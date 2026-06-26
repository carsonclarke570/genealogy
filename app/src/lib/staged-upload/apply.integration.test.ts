/**
 * DB-backed integration test for the staged-upload applier. Runs only when
 * ITEST_DATABASE_URL points at a throwaway Postgres (see the e2e run); the normal
 * `npm test` skips it. It applies the real schema (minus the pgvector-backed
 * search_doc table, which the applier never touches) and drives `applyBatch`
 * through a real transaction, asserting that records actually persist.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { applyBatch } from "./apply";
import type { BatchUpdates } from "./payload";

const DB_URL = process.env.ITEST_DATABASE_URL;
const MIGRATIONS = fileURLToPath(new URL("../../db/migrations", import.meta.url));

describe.skipIf(!DB_URL)("applyBatch (integration)", () => {
  let pool: Pool;
  let db: NodePgDatabase<typeof schema>;
  let subjectIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({ connectionString: DB_URL });
    db = drizzle(pool, { schema });

    // Apply the real migration DDL, skipping any statement that needs pgvector /
    // the full-text search machinery (the applier doesn't touch those tables).
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
    const skip = /vector|search_doc|hnsw|embedding|tsvector|to_tsvector|using gin|\btsv\b/i;
    for (const f of files) {
      const sql = readFileSync(path.join(MIGRATIONS, f), "utf8");
      for (const stmt of sql.split("--> statement-breakpoint")) {
        const s = stmt.trim();
        if (!s || skip.test(s)) continue;
        await pool.query(s);
      }
    }

    // Seed: a media document + an existing person (Eleanor) with a birth name.
    await db.insert(schema.media).values({ id: "M-itest", type: "certificate", title: "Test certificate", prov: "unverified" });
    await db.insert(schema.person).values({
      id: "P1",
      given: "Eleanor",
      surname: "Whitfield",
      sex: "f",
      bornYear: 1915,
      bornDate: "1915",
      living: true,
      docs: "{}",
      prov: "{}",
    });
    await db.insert(schema.personName).values({
      id: "PN1",
      personId: "P1",
      given: "Eleanor",
      surname: "Whitfield",
      effectiveDate: "1915",
      effectiveYear: 1915,
      reason: "birth",
      prov: "unverified",
      ordinal: 0,
    });

    const batch: BatchUpdates = {
      subjects: [
        {
          ref: { kind: "existing", personId: "P1" },
          changes: [
            { model: "life", op: "set-field", field: "bornPlace", value: { label: "Concord, MA" } },
            { model: "person", op: "set-field", field: "surname", value: "Reed" },
            { model: "residences", op: "add-item", tempItemId: "rt1", data: { location: { label: "Concord, MA" }, dateKind: "range", start: "1950", end: null, note: "Family home" } },
            { model: "events", op: "add-item", tempItemId: "et1", data: { type: "military", title: "Enlisted in the U.S. Army", date: "1942", place: "Boston, MA", location: { label: "Boston, MA" } } },
          ],
        },
        {
          ref: { kind: "new", spec: { tempId: "new-1", given: "Henry", surname: "Whitfield", sex: "m", bornYear: 1940 } },
          changes: [{ model: "rels", op: "add-item", tempItemId: "rl1", data: { type: "parent", target: { ref: "existing", id: "P1" } } }],
        },
      ],
    };

    const result = await db.transaction(async (tx) => applyBatch(tx, "M-itest", batch));
    subjectIds = result.subjectIds;
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("returns both subject ids (existing + newly created)", () => {
    expect(subjectIds).toContain("P1");
    expect(subjectIds.length).toBe(2);
  });

  it("creates the new person from the quick-add spec", async () => {
    const rows = await db.select().from(schema.person).where(eq(schema.person.given, "Henry"));
    expect(rows).toHaveLength(1);
    expect(rows[0].surname).toBe("Whitfield");
    expect(rows[0].bornYear).toBe(1940);
  });

  it("applies an identity (surname) change through the name history", async () => {
    const [p] = await db.select().from(schema.person).where(eq(schema.person.id, "P1"));
    expect(p.surname).toBe("Reed");
    const names = await db.select().from(schema.personName).where(eq(schema.personName.personId, "P1"));
    expect(names.some((n) => n.surname === "Reed")).toBe(true);
  });

  it("sets the birth place and cites the document as a verified source", async () => {
    const [p] = await db.select().from(schema.person).where(eq(schema.person.id, "P1"));
    expect(p.bornPlace).toBe("Concord, MA");
    const prov = JSON.parse(p.prov) as Record<string, { status: string; mediaId: string | null }>;
    expect(prov.bornPlace).toMatchObject({ status: "verified", mediaId: "M-itest" });
  });

  it("adds a residence cited to the document, with the subject as a resident", async () => {
    const res = await db.select().from(schema.residence).where(eq(schema.residence.placeLabel, "Concord, MA"));
    expect(res).toHaveLength(1);
    expect(res[0].prov).toBe("verified");
    expect(res[0].mediaId).toBe("M-itest");
    expect(res[0].startYear).toBe(1950);
    const link = await db.select().from(schema.residencePerson).where(eq(schema.residencePerson.residenceId, res[0].id));
    expect(link.map((l) => l.personId)).toContain("P1");
  });

  it("adds a verified life event linked to the subject", async () => {
    const ev = await db.select().from(schema.event).where(eq(schema.event.title, "Enlisted in the U.S. Army"));
    expect(ev).toHaveLength(1);
    expect(ev[0].type).toBe("military");
    expect(ev[0].prov).toBe("verified");
    expect(ev[0].mediaId).toBe("M-itest");
    expect(ev[0].year).toBe(1942);
    const link = await db.select().from(schema.eventPerson).where(eq(schema.eventPerson.eventId, ev[0].id));
    expect(link.map((l) => l.personId)).toContain("P1");
  });

  it("creates the new person's parent relationship to the existing subject", async () => {
    const newPerson = (await db.select().from(schema.person).where(eq(schema.person.given, "Henry")))[0];
    const edges = await db
      .select()
      .from(schema.relationship)
      .where(and(eq(schema.relationship.kind, "parent"), eq(schema.relationship.relatedId, newPerson.id)));
    expect(edges).toHaveLength(1);
    expect(edges[0].personId).toBe("P1"); // P1 is the parent of the new person
  });
});
