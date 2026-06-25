/**
 * Seed a database from the demo family literals (db/seed-data.ts).
 *
 * `seed(db)` is idempotent at the table level: it no-ops if `person` already
 * has rows, so it is safe to call on every boot (see db/client.ts) and via the
 * `npm run db:seed` script. It translates couple-units into normalised
 * `relationship` rows:
 *   - one "spouse" row per partnered unit (personId = anchor, by convention),
 *   - two "parent" rows per child (one per parent in the parent unit).
 */
import { count } from "drizzle-orm";
import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { people, units, media, events, residences, places } from "./seed-data";
import { parsePartialDate } from "../lib/dates";
import { normalizePlace, placeKeyId } from "../lib/place-key";

type DB = NodePgDatabase<typeof schema>;

export async function seed(db: DB): Promise<{ seeded: boolean }> {
  const [{ n }] = await db.select({ n: count() }).from(schema.person);
  if (n > 0) return { seeded: false };

  const unitById = new Map(units.map((u) => [u.id, u]));

  // Each partner's spouse edge (id + married date), so a married-name change can
  // link to the marriage that caused it (and inherit its date).
  const spouseByPerson = new Map<string, { relId: string; married?: string }>();
  for (const u of units) {
    if (!u.partner) continue;
    const relId = `r_spouse_${u.id}`;
    spouseByPerson.set(u.anchor, { relId, married: u.married });
    spouseByPerson.set(u.partner, { relId, married: u.married });
  }

  await db.transaction(async (tx) => {
    for (const p of Object.values(people)) {
      await tx.insert(schema.person).values({
        id: p.id,
        given: p.given,
        surname: p.surname,
        maiden: p.maiden,
        sex: p.sex,
        bornYear: p.born,
        bornDate: p.born != null ? String(p.born) : null,
        bornPlace: p.bornPlace,
        diedYear: p.died,
        diedDate: p.died != null ? String(p.died) : null,
        diedPlace: p.diedPlace,
        living: p.living,
        docs: JSON.stringify(p.docs ?? {}),
        prov: JSON.stringify(p.prov ?? {}),
      });
    }

    // Media is inserted *before* relationships so a marriage's cited source FK
    // (married_media_id) resolves; person_media links resolve off the people above.
    for (const m of media) {
      // Certificates and obituaries are official records → seed them verified;
      // everything else starts unverified (the curator can confirm later).
      const prov = m.type === "certificate" || m.type === "obituary" ? "verified" : "unverified";
      await tx.insert(schema.media).values({ id: m.id, type: m.type, title: m.title, year: m.year, prov });
      for (const pid of m.people) {
        await tx.insert(schema.personMedia).values({ personId: pid, mediaId: m.id });
      }
    }

    // A marriage cites a wedding/marriage document (linked to both partners) as its
    // source, mirroring how the timeline used to infer it — so the demo opens with a
    // few "verified" marriages instead of every one reading unverified.
    const marriageSource = (a: string, b: string): string | null =>
      media.find((m) => m.people.includes(a) && m.people.includes(b) && /\b(marri|wedding)/i.test(m.title))?.id ?? null;

    for (const u of units) {
      if (u.partner) {
        const src = marriageSource(u.anchor, u.partner);
        await tx.insert(schema.relationship).values({
          id: `r_spouse_${u.id}`,
          kind: "spouse",
          personId: u.anchor, // anchor side, by convention
          relatedId: u.partner,
          status: u.rel,
          marriedDate: u.married ?? null,
          divorcedDate: u.divorced ?? null,
          marriedProv: src ? "verified" : "unverified",
          marriedMediaId: src,
        });
      }
      if (u.parent) {
        const pu = unitById.get(u.parent);
        if (!pu) continue;
        const parents = [pu.anchor, pu.partner].filter((x): x is string => !!x);
        for (const parentId of parents) {
          await tx.insert(schema.relationship).values({
            id: `r_parent_${parentId}_${u.anchor}`,
            kind: "parent",
            personId: parentId, // parent
            relatedId: u.anchor, // child
          });
        }
      }
    }

    // Name history. Every person gets a birth name; anyone with a recorded maiden
    // surname (i.e. who changed their name) also gets a current/married name row,
    // linked to the marriage that caused it — exercising the name-change timeline.
    // Inserted after the spouse rows above so the relationship FK resolves.
    for (const p of Object.values(people)) {
      const birthSurname = p.maiden ?? p.surname;
      await tx.insert(schema.personName).values({
        id: `pn_${p.id}_birth`,
        personId: p.id,
        given: p.given,
        surname: birthSurname,
        effectiveDate: p.born != null ? String(p.born) : null,
        effectiveYear: p.born,
        reason: "birth",
        ordinal: 0,
      });
      if (p.maiden && p.maiden !== p.surname) {
        const sp = spouseByPerson.get(p.id);
        await tx.insert(schema.personName).values({
          id: `pn_${p.id}_married`,
          personId: p.id,
          given: p.given,
          surname: p.surname,
          effectiveDate: sp?.married ?? null,
          effectiveYear: parsePartialDate(sp?.married ?? null)?.year ?? null,
          reason: "marriage",
          relationshipId: sp?.relId ?? null,
          ordinal: 1,
        });
      }
    }

    for (const e of events) {
      await tx.insert(schema.event).values({
        id: e.id,
        type: e.type,
        title: e.title,
        date: e.date,
        year: parsePartialDate(e.date)?.year ?? null,
        place: e.place,
        prov: e.prov,
        mediaId: e.mediaId,
      });
      for (const pid of e.people) {
        await tx.insert(schema.eventPerson).values({ eventId: e.id, personId: pid });
      }
    }

    // Residencies (where people lived). Inserted after media so a cited source FK
    // resolves. The display label doubles as the structured `placeLabel`. A home is
    // shared by a household, so residents are linked through `residence_person`.
    for (const r of residences) {
      await tx.insert(schema.residence).values({
        id: r.id,
        country: r.country ?? null,
        region: r.region ?? null,
        locality: r.locality ?? null,
        address: null,
        placeLabel: r.place,
        dateKind: r.dateKind ?? "range",
        startDate: r.start,
        startYear: parsePartialDate(r.start)?.year ?? null,
        endDate: r.end ?? null,
        endYear: parsePartialDate(r.end ?? null)?.year ?? null,
        prov: r.prov,
        mediaId: r.mediaId ?? null,
        note: r.note ?? null,
      });
      for (const personId of r.personIds) {
        await tx.insert(schema.residencePerson).values({ residenceId: r.id, personId });
      }
    }

    // Starter gazetteer — pre-resolved coordinates so the Family Map works with
    // no geocoder. Keyed on the normalised label, so it dedupes with anything the
    // batch geocoder / capture-at-entry later adds.
    for (const pl of places) {
      const normalized = normalizePlace(pl.label);
      await tx.insert(schema.place).values({
        id: placeKeyId(normalized),
        normalized,
        label: pl.label,
        lat: pl.lat,
        lng: pl.lng,
        source: "geocoder",
        status: "resolved",
      });
    }
  });

  return { seeded: true };
}

// Allow running directly: `npm run db:seed` (tsx src/db/seed.ts). Opens its own
// connection so this stays runnable as a plain Node script (the app's client.ts
// is server-only and would refuse to load here).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void (async () => {
    const path = (await import("node:path")).default;
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "src", "db", "migrations") });

    const { seeded } = await seed(db);
    console.log(seeded ? "Seeded the family archive." : "Already seeded — nothing to do.");
    await pool.end();
  })();
}
