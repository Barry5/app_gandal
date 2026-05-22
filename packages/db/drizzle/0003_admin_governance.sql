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
CREATE INDEX IF NOT EXISTS "idx_admin_activity_actor" ON "admin_activity_logs" ("actor_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_activity_target" ON "admin_activity_logs" ("target_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_activity_created" ON "admin_activity_logs" ("created_at");
