CREATE TABLE "residence" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"country" text,
	"region" text,
	"locality" text,
	"address" text,
	"place_label" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"place_id" text,
	"start_date" text,
	"start_year" integer,
	"end_date" text,
	"end_year" integer,
	"prov" text DEFAULT 'unverified' NOT NULL,
	"media_id" text,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "prov" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "relationship" ADD COLUMN "married_prov" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "relationship" ADD COLUMN "married_media_id" text;--> statement-breakpoint
ALTER TABLE "relationship" ADD COLUMN "divorced_prov" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "relationship" ADD COLUMN "divorced_media_id" text;--> statement-breakpoint
ALTER TABLE "residence" ADD CONSTRAINT "residence_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residence" ADD CONSTRAINT "residence_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "residence_person_idx" ON "residence" USING btree ("person_id");--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_married_media_id_media_id_fk" FOREIGN KEY ("married_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_divorced_media_id_media_id_fk" FOREIGN KEY ("divorced_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill: migrate existing point-in-time `residence` events into first-class
-- residence spans — one per linked person — then remove those events. The event's
-- title is kept as the residence note so no description is lost. New installs seed
-- residencies directly, so this only affects databases that predate the table.
INSERT INTO "residence" ("id", "person_id", "place_label", "start_date", "start_year", "prov", "media_id", "note")
SELECT ev."id" || ':' || ep."person_id", ep."person_id",
       COALESCE(NULLIF(ev."place", ''), ev."title"),
       ev."date", ev."year", ev."prov", ev."media_id", ev."title"
FROM "event" ev
JOIN "event_person" ep ON ep."event_id" = ev."id"
WHERE ev."type" = 'residence';--> statement-breakpoint
DELETE FROM "event" WHERE "type" = 'residence';