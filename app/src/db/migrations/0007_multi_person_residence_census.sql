CREATE TABLE "residence_person" (
	"residence_id" text NOT NULL,
	"person_id" text NOT NULL,
	CONSTRAINT "residence_person_residence_id_person_id_pk" PRIMARY KEY("residence_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "residence" DROP CONSTRAINT "residence_person_id_person_id_fk";
--> statement-breakpoint
DROP INDEX "residence_person_idx";--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "auto_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "residence" ADD COLUMN "auto_managed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "residence_person" ADD CONSTRAINT "residence_person_residence_id_residence_id_fk" FOREIGN KEY ("residence_id") REFERENCES "public"."residence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residence_person" ADD CONSTRAINT "residence_person_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "residence_person_person_idx" ON "residence_person" USING btree ("person_id");--> statement-breakpoint
-- Backfill: a residence is now many-to-many with people. Carry each existing
-- row's single resident into the join table before dropping the column, so no
-- residence loses its person. New installs seed the join rows directly.
INSERT INTO "residence_person" ("residence_id", "person_id")
SELECT "id", "person_id" FROM "residence";--> statement-breakpoint
ALTER TABLE "residence" DROP COLUMN "person_id";