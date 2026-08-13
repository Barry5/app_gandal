CREATE TABLE IF NOT EXISTS "commission_rate_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"scope" varchar(20) NOT NULL,
	"creator_id" uuid,
	"category" varchar(100),
	"old_rate" integer NOT NULL,
	"new_rate" integer NOT NULL,
	"changed_by" uuid,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(20) DEFAULT 'global' NOT NULL,
	"creator_id" uuid,
	"category" varchar(100),
	"rate" integer NOT NULL,
	"min_commission_amount" integer,
	"max_commission_amount" integer,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_promo" boolean DEFAULT false NOT NULL,
	"promo_label" varchar(100),
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_monetization_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"previous_mode" varchar(20) NOT NULL,
	"new_mode" varchar(20) NOT NULL,
	"subscription_id" uuid,
	"reason" varchar(255),
	"changed_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"plan_id" uuid,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"price_at_subscription" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'GNF' NOT NULL,
	"payment_method" varchar(50),
	"transaction_ref" varchar(255),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"next_renewal_at" timestamp,
	"is_trial" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'GNF' NOT NULL,
	"payment_method" varchar(50),
	"provider" "payment_providers",
	"provider_ref" varchar(255),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_gnf" integer DEFAULT 0 NOT NULL,
	"billing_interval" varchar(20) DEFAULT 'monthly' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trial_period_days" integer DEFAULT 0 NOT NULL,
	"max_courses" integer,
	"max_students" integer,
	"commission_rate" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'GNF' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"method" varchar(50),
	"reference" varchar(255),
	"rejection_reason" text,
	"processed_by" uuid,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_activations" ADD COLUMN "payment_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_activations" ADD COLUMN "monetization_model_at_sale" varchar(20) DEFAULT 'commission' NOT NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "monetization_model" varchar(20) DEFAULT 'commission' NOT NULL;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "custom_commission_rate" integer;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "subscription_status" varchar(30);--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "subscription_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "has_used_trial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD COLUMN "payment_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD COLUMN "monetization_model_at_sale" varchar(20) DEFAULT 'commission' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commission_rate_history" ADD CONSTRAINT "commission_rate_history_rule_id_commission_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."commission_rules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commission_rate_history" ADD CONSTRAINT "commission_rate_history_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commission_rate_history" ADD CONSTRAINT "commission_rate_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_monetization_history" ADD CONSTRAINT "creator_monetization_history_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_monetization_history" ADD CONSTRAINT "creator_monetization_history_subscription_id_creator_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."creator_subscriptions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_monetization_history" ADD CONSTRAINT "creator_monetization_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_creator_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."creator_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_rate_history_rule" ON "commission_rate_history" ("rule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_rate_history_created" ON "commission_rate_history" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_rules_scope" ON "commission_rules" ("scope");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_rules_creator" ON "commission_rules" ("creator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_commission_rules_category" ON "commission_rules" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monetization_history_creator" ON "creator_monetization_history" ("creator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_monetization_history_created" ON "creator_monetization_history" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creator_subscriptions_creator" ON "creator_subscriptions" ("creator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creator_subscriptions_status" ON "creator_subscriptions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creator_subscriptions_expiry" ON "creator_subscriptions" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_payments_subscription" ON "subscription_payments" ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_payments_provider_ref" ON "subscription_payments" ("provider_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_plans_active" ON "subscription_plans" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawals_creator" ON "withdrawals" ("creator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawals_user" ON "withdrawals" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_withdrawals_status" ON "withdrawals" ("status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creators" ADD CONSTRAINT "creators_subscription_id_creator_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."creator_subscriptions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "subscription_plans" ("name", "price_gnf", "billing_interval", "features", "trial_period_days", "max_courses", "max_students", "commission_rate", "sort_order", "is_active", "is_public") VALUES
  ('Starter', 0, 'monthly', '["Publication de cours illimitee","Commission de 15% sur chaque vente","Statistiques de base","Support communautaire"]'::jsonb, 0, NULL, 10, 15, 1, true, true),
  ('Pro', 75000, 'monthly', '["0% de commission sur les ventes","Publication de cours illimitee","Statistiques avancees","Certificats personnalises","Support prioritaire"]'::jsonb, 0, NULL, 50, 0, 2, true, true),
  ('Business', 200000, 'monthly', '["0% de commission sur les ventes","Cours illimites et apprenants illimites","Statistiques avancees","Certificats personnalises","Export de donnees","Support dedie"]'::jsonb, 0, NULL, NULL, 0, 3, true, true),
  ('Enterprise', 0, 'monthly', '["Offre sur devis","0% de commission sur les ventes","Fonctionnalites sur mesure","Support dedie","Contrat personnalise"]'::jsonb, 0, NULL, NULL, 0, 4, true, false);--> statement-breakpoint
INSERT INTO "commission_rates" ("plan", "rate") VALUES
  ('free', 15),
  ('pro', 0),
  ('enterprise', 0)
ON CONFLICT ("plan") DO UPDATE SET "rate" = EXCLUDED."rate";--> statement-breakpoint
INSERT INTO "commission_rules" ("scope", "category", "rate", "is_active", "is_promo", "promo_label") VALUES
  ('global', NULL, 15, true, false, 'Taux standard');
