CREATE TABLE "person_name" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"given" text NOT NULL,
	"surname" text NOT NULL,
	"effective_date" text,
	"effective_year" integer,
	"reason" text DEFAULT 'birth' NOT NULL,
	"relationship_id" text,
	"event_id" text,
	"media_id" text,
	"prov" text DEFAULT 'unverified' NOT NULL,
	"note" text,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "person_name" ADD CONSTRAINT "person_name_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_name" ADD CONSTRAINT "person_name_relationship_id_relationship_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationship"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_name" ADD CONSTRAINT "person_name_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_name" ADD CONSTRAINT "person_name_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "person_name_person_idx" ON "person_name" USING btree ("person_id");--> statement-breakpoint
-- Backfill the name history from existing person rows. Every person gets a birth
-- name (surname = the maiden name when one is recorded, i.e. the name held before
-- a change); anyone with a recorded maiden also gets a current/married name row.
-- The married row is left undated (sorts as the most recent) and unlinked — a
-- standalone name-change event the curator can later attach to a marriage.
INSERT INTO "person_name" ("id", "person_id", "given", "surname", "effective_date", "effective_year", "reason", "prov", "ordinal")
SELECT "id" || ':name-birth', "id", "given", COALESCE("maiden", "surname"), "born_date", "born_year", 'birth', 'unverified', 0
FROM "person";--> statement-breakpoint
INSERT INTO "person_name" ("id", "person_id", "given", "surname", "effective_date", "effective_year", "reason", "prov", "ordinal")
SELECT "id" || ':name-current', "id", "given", "surname", NULL, NULL, 'marriage', 'unverified', 1
FROM "person"
WHERE "maiden" IS NOT NULL AND "maiden" <> "surname";