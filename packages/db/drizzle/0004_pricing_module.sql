CREATE TABLE IF NOT EXISTS "pricing_tiers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "label" varchar(100) DEFAULT 'Standard' NOT NULL,
  "price" integer DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'GNF' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "valid_from" timestamp,
  "valid_to" timestamp,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pricing_tiers" ADD CONSTRAINT "pricing_tiers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_tiers_course" ON "pricing_tiers" ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_tiers_active" ON "pricing_tiers" ("is_active");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_price_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "old_price" integer DEFAULT 0 NOT NULL,
  "new_price" integer DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'GNF' NOT NULL,
  "changed_by" uuid,
  "reason" varchar(255),
  "enrolled_students_at_change" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_price_history" ADD CONSTRAINT "course_price_history_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_price_history" ADD CONSTRAINT "course_price_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_history_course" ON "course_price_history" ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_history_created" ON "course_price_history" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commission_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan" creator_plans NOT NULL,
  "rate" integer DEFAULT 10 NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "commission_rates_plan_unique" UNIQUE("plan")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commission_rates" ADD CONSTRAINT "commission_rates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "commission_rates" ("plan", "rate") VALUES ('free', 10) ON CONFLICT ("plan") DO NOTHING;
--> statement-breakpoint
INSERT INTO "commission_rates" ("plan", "rate") VALUES ('pro', 3) ON CONFLICT ("plan") DO NOTHING;
--> statement-breakpoint
INSERT INTO "commission_rates" ("plan", "rate") VALUES ('enterprise', 0) ON CONFLICT ("plan") DO NOTHING;
