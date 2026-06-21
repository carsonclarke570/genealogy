CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"file_path" text,
	"mime_type" text,
	"original_filename" text,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" text PRIMARY KEY NOT NULL,
	"given" text NOT NULL,
	"surname" text NOT NULL,
	"maiden" text,
	"sex" text NOT NULL,
	"born_year" integer,
	"born_place" text,
	"died_year" integer,
	"died_place" text,
	"living" boolean DEFAULT false NOT NULL,
	"notes" text,
	"docs" text DEFAULT '{}' NOT NULL,
	"prov" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "person_media" (
	"person_id" text NOT NULL,
	"media_id" text NOT NULL,
	CONSTRAINT "person_media_person_id_media_id_pk" PRIMARY KEY("person_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "relationship" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"person_id" text NOT NULL,
	"related_id" text NOT NULL,
	"status" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "person_media" ADD CONSTRAINT "person_media_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_media" ADD CONSTRAINT "person_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_related_id_person_id_fk" FOREIGN KEY ("related_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;