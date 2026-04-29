ALTER TYPE "public"."drop_status" ADD VALUE 'paused' BEFORE 'closed';--> statement-breakpoint
ALTER TABLE "drop" ADD COLUMN "mockup_key" text;