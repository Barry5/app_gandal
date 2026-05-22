ALTER TYPE "public"."payment_providers" ADD VALUE IF NOT EXISTS 'offline_code';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_access_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "creator_id" uuid,
  "generated_by" uuid,
  "code_hash" varchar(128) NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "max_uses" integer DEFAULT 1 NOT NULL,
  "used_count" integer DEFAULT 0 NOT NULL,
  "used_by" uuid,
  "used_at" timestamp,
  "expires_at" timestamp NOT NULL,
  "payment_ref" varchar(255),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "course_access_codes_code_hash_unique" UNIQUE("code_hash"),
  CONSTRAINT "course_access_codes_payment_ref_unique" UNIQUE("payment_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_access_code_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "access_code_id" uuid,
  "user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "attempted_code_hash" varchar(128) NOT NULL,
  "success" boolean DEFAULT false NOT NULL,
  "ip_address" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_code_attempts" ADD CONSTRAINT "course_access_code_attempts_access_code_id_course_access_codes_id_fk" FOREIGN KEY ("access_code_id") REFERENCES "public"."course_access_codes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_code_attempts" ADD CONSTRAINT "course_access_code_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_code_attempts" ADD CONSTRAINT "course_access_code_attempts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_codes_course" ON "course_access_codes" ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_codes_status" ON "course_access_codes" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_codes_hash" ON "course_access_codes" ("code_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_code_attempts_user_course" ON "course_access_code_attempts" ("user_id","course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_code_attempts_created" ON "course_access_code_attempts" ("created_at");
