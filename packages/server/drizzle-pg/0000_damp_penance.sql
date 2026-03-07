CREATE TABLE "blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"title" text,
	"fields" jsonb,
	"is_reusable" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "page_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"block_id" integer NOT NULL,
	"region" text NOT NULL,
	"position" integer NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"overrides" jsonb
);
--> statement-breakpoint
CREATE TABLE "block_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"fields_schema" jsonb,
	"icon" text,
	"settings" jsonb,
	CONSTRAINT "block_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"fields_schema" jsonb,
	"regions" jsonb,
	"settings" jsonb,
	CONSTRAINT "content_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"permissions" text DEFAULT 'content:read' NOT NULL,
	"expires_at" text,
	"last_used_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer,
	"details" text,
	"ip_address" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"term_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"title" text,
	"folder" text,
	"path" text NOT NULL,
	"variants" jsonb,
	"metadata" jsonb,
	"created_at" text NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_id" integer NOT NULL,
	"parent_id" integer,
	"title" text NOT NULL,
	"url" text,
	"page_id" integer,
	"target" text DEFAULT '_self' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"is_expanded" boolean DEFAULT false NOT NULL,
	"attributes" jsonb
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "menus_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "page_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"fields" jsonb,
	"blocks" jsonb,
	"created_at" text NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"fields" jsonb,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"published_at" text,
	"scheduled_at" text,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"robots" text,
	"created_by" integer,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"hierarchical" boolean DEFAULT false NOT NULL,
	"settings" jsonb,
	CONSTRAINT "taxonomies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"taxonomy_id" integer NOT NULL,
	"parent_id" integer,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"weight" integer DEFAULT 0 NOT NULL,
	"fields" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" text,
	"last_status" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_type_id_block_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."block_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_blocks" ADD CONSTRAINT "page_blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_blocks" ADD CONSTRAINT "page_blocks_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_terms" ADD CONSTRAINT "content_terms_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_revisions" ADD CONSTRAINT "page_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_type_id_content_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."content_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_taxonomy_id_taxonomies_id_fk" FOREIGN KEY ("taxonomy_id") REFERENCES "public"."taxonomies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_blocks_type" ON "blocks" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "idx_blocks_reusable" ON "blocks" USING btree ("is_reusable");--> statement-breakpoint
CREATE INDEX "idx_page_blocks_page" ON "page_blocks" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_page_blocks_block" ON "page_blocks" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "idx_page_blocks_page_region" ON "page_blocks" USING btree ("page_id","region");--> statement-breakpoint
CREATE INDEX "idx_content_terms_entity" ON "content_terms" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_content_terms_term" ON "content_terms" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "idx_media_mime" ON "media" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "idx_media_folder" ON "media" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "idx_menu_items_menu" ON "menu_items" USING btree ("menu_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_parent" ON "menu_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_revisions_page" ON "page_revisions" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_pages_slug" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_pages_type" ON "pages" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "idx_pages_status" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pages_type_status" ON "pages" USING btree ("type_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_redirects_from" ON "redirects" USING btree ("from_path");--> statement-breakpoint
CREATE INDEX "idx_terms_taxonomy" ON "terms" USING btree ("taxonomy_id");--> statement-breakpoint
CREATE INDEX "idx_terms_parent" ON "terms" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_terms_slug" ON "terms" USING btree ("taxonomy_id","slug");