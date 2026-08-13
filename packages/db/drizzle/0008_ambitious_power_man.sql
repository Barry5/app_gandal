ALTER TABLE "creator_subscriptions" ADD COLUMN "grace_period_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "grace_period_ends_at" timestamp;--> statement-breakpoint
UPDATE "subscription_plans" SET "trial_period_days" = 14 WHERE "name" = 'Pro' AND "trial_period_days" = 0;
