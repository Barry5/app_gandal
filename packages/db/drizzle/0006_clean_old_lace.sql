ALTER TABLE "course_access_codes" ADD COLUMN "price_at_generation" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_access_codes" ADD COLUMN "gross_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_access_codes" ADD COLUMN "platform_commission" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_access_codes" ADD COLUMN "trainer_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_access_codes" ADD COLUMN "commission_rate" integer DEFAULT 0 NOT NULL;