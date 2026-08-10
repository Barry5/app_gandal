DO $$ BEGIN
 CREATE TYPE "public"."financial_transaction_status" AS ENUM('DUE', 'VALIDATED', 'PAID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_submission_status" AS ENUM('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'ACTIVATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "lesson_type" ADD VALUE 'image';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "payment_providers" ADD VALUE 'cinetpay';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "payment_providers" ADD VALUE 'offline_code';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS "admin_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commission_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan" "creator_plans" NOT NULL,
	"rate" integer DEFAULT 10 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commission_rates_plan_unique" UNIQUE("plan")
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
CREATE TABLE IF NOT EXISTS "course_activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"trainer_id" uuid NOT NULL,
	"course_snapshot" jsonb NOT NULL,
	"price_at_activation" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'GNF' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"payment_reference" varchar(255),
	"gross_amount" integer NOT NULL,
	"platform_commission" integer NOT NULL,
	"trainer_amount" integer NOT NULL,
	"commission_rate" integer NOT NULL,
	"payment_submission_id" uuid,
	"status" varchar(20) DEFAULT 'ACTIVATED' NOT NULL,
	"activated_by" uuid,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
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
CREATE TABLE IF NOT EXISTS "financial_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activation_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"trainer_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"gross_amount" integer NOT NULL,
	"platform_commission" integer NOT NULL,
	"trainer_amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'GNF' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"payment_reference" varchar(255),
	"commission_rate" integer NOT NULL,
	"status" "financial_transaction_status" DEFAULT 'DUE' NOT NULL,
	"validated_by" uuid,
	"validated_at" timestamp,
	"paid_by" uuid,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financial_transactions_activation_id_unique" UNIQUE("activation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'GNF' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"phone_number" varchar(20),
	"operator_reference" varchar(255),
	"payment_date" varchar(20),
	"proof_url" varchar(500),
	"notes" text,
	"status" "payment_submission_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "lessons" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "media_public_id" varchar(500);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commission_rates" ADD CONSTRAINT "commission_rates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_code_attempts" ADD CONSTRAINT "course_access_code_attempts_access_code_id_course_access_codes_id_fk" FOREIGN KEY ("access_code_id") REFERENCES "public"."course_access_codes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_code_attempts" ADD CONSTRAINT "course_access_code_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_code_attempts" ADD CONSTRAINT "course_access_code_attempts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_access_codes" ADD CONSTRAINT "course_access_codes_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_activations" ADD CONSTRAINT "course_activations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_activations" ADD CONSTRAINT "course_activations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_activations" ADD CONSTRAINT "course_activations_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_activations" ADD CONSTRAINT "course_activations_payment_submission_id_payment_submissions_id_fk" FOREIGN KEY ("payment_submission_id") REFERENCES "public"."payment_submissions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_activations" ADD CONSTRAINT "course_activations_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
DO $$ BEGIN
 ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_activation_id_course_activations_id_fk" FOREIGN KEY ("activation_id") REFERENCES "public"."course_activations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pricing_tiers" ADD CONSTRAINT "pricing_tiers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_activity_actor" ON "admin_activity_logs" ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_activity_target" ON "admin_activity_logs" ("target_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_activity_created" ON "admin_activity_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_code_attempts_user_course" ON "course_access_code_attempts" ("user_id","course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_code_attempts_created" ON "course_access_code_attempts" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_codes_course" ON "course_access_codes" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_codes_status" ON "course_access_codes" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_access_codes_hash" ON "course_access_codes" ("code_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_course_activations_course" ON "course_activations" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_course_activations_student" ON "course_activations" ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_course_activations_trainer" ON "course_activations" ("trainer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_history_course" ON "course_price_history" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_price_history_created" ON "course_price_history" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_transactions_trainer" ON "financial_transactions" ("trainer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_transactions_status" ON "financial_transactions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_financial_transactions_course" ON "financial_transactions" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_submissions_user" ON "payment_submissions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_submissions_course" ON "payment_submissions" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_submissions_status" ON "payment_submissions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_tiers_course" ON "pricing_tiers" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_tiers_active" ON "pricing_tiers" ("is_active");