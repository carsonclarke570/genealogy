CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"date" text,
	"year" integer,
	"place" text,
	"prov" text DEFAULT 'unverified' NOT NULL,
	"media_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_person" (
	"event_id" text NOT NULL,
	"person_id" text NOT NULL,
	CONSTRAINT "event_person_event_id_person_id_pk" PRIMARY KEY("event_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "relationship" ADD COLUMN "married_date" text;--> statement-breakpoint
ALTER TABLE "relationship" ADD COLUMN "divorced_date" text;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_person" ADD CONSTRAINT "event_person_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_person" ADD CONSTRAINT "event_person_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;