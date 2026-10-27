CREATE TABLE "accounts" (
	"key" text PRIMARY KEY NOT NULL,
	"bank" text NOT NULL,
	"label" text NOT NULL,
	"last4" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"dedup_key" text NOT NULL,
	"upload_id" integer NOT NULL,
	"bank" text NOT NULL,
	"account_key" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"amount_kop" bigint NOT NULL,
	"description" text NOT NULL,
	"bank_category" text,
	"mcc" integer,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "transactions_dedup_key_unique" UNIQUE("dedup_key")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"bank" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_from" date,
	"period_to" date,
	"total" integer DEFAULT 0 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"duplicates" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_occurred_at_idx" ON "transactions" USING btree ("occurred_at");