CREATE TABLE "place" (
	"id" text PRIMARY KEY NOT NULL,
	"normalized" text NOT NULL,
	"label" text NOT NULL,
	"country" text,
	"region" text,
	"locality" text,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"place_id" text,
	"source" text,
	"status" text DEFAULT 'unresolved' NOT NULL,
	"geocoded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "place_normalized_unique" UNIQUE("normalized")
);
