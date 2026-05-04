ALTER TABLE "order" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "refunded_at" timestamp;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "confirmation_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "shipping_email_sent_at" timestamp;