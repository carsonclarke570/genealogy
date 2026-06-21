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
import { people, units, media } from "./seed-data";

type DB = NodePgDatabase<typeof schema>;

export async function seed(db: DB): Promise<{ seeded: boolean }> {
  const [{ n }] = await db.select({ n: count() }).from(schema.person);
  if (n > 0) return { seeded: false };

  const unitById = new Map(units.map((u) => [u.id, u]));

  await db.transaction(async (tx) => {
    for (const p of Object.values(people)) {
      await tx.insert(schema.person).values({
        id: p.id,
        given: p.given,
        surname: p.surname,
        maiden: p.maiden,
        sex: p.sex,
        bornYear: p.born,
        bornPlace: p.bornPlace,
        diedYear: p.died,
        diedPlace: p.diedPlace,
        living: p.living,
        docs: JSON.stringify(p.docs ?? {}),
        prov: JSON.stringify(p.prov ?? {}),
      });
    }

    for (const u of units) {
      if (u.partner) {
        await tx.insert(schema.relationship).values({
          id: `r_spouse_${u.id}`,
          kind: "spouse",
          personId: u.anchor, // anchor side, by convention
          relatedId: u.partner,
          status: u.rel,
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

    for (const m of media) {
      await tx.insert(schema.media).values({ id: m.id, type: m.type, title: m.title, year: m.year });
      for (const pid of m.people) {
        await tx.insert(schema.personMedia).values({ personId: pid, mediaId: m.id });
      }
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
