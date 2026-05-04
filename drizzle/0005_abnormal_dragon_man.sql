CREATE TYPE "public"."email_template" AS ENUM('order_confirmation_buyer', 'order_notification_creator', 'order_shipped_buyer', 'order_cancelled_buyer', 'order_cancelled_creator');--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"template" "email_template" NOT NULL,
	"recipient" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"error" text
);
