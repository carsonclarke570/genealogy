CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`file_path` text,
	`mime_type` text,
	`original_filename` text,
	`description` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `person` (
	`id` text PRIMARY KEY NOT NULL,
	`given` text NOT NULL,
	`surname` text NOT NULL,
	`maiden` text,
	`sex` text NOT NULL,
	`born_year` integer,
	`born_place` text,
	`died_year` integer,
	`died_place` text,
	`living` integer DEFAULT false NOT NULL,
	`notes` text,
	`docs` text DEFAULT '{}' NOT NULL,
	`prov` text DEFAULT '{}' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `person_media` (
	`person_id` text NOT NULL,
	`media_id` text NOT NULL,
	PRIMARY KEY(`person_id`, `media_id`),
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `relationship` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`person_id` text NOT NULL,
	`related_id` text NOT NULL,
	`status` text,
	`created_at` integer,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE cascade
);
