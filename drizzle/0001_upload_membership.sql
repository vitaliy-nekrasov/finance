CREATE TABLE "upload_transactions" (
	"upload_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	CONSTRAINT "upload_transactions_upload_id_transaction_id_pk" PRIMARY KEY("upload_id","transaction_id")
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_upload_id_uploads_id_fk";
--> statement-breakpoint
ALTER TABLE "upload_transactions" ADD CONSTRAINT "upload_transactions_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_transactions" ADD CONSTRAINT "upload_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_transactions_transaction_id_idx" ON "upload_transactions" USING btree ("transaction_id");--> statement-breakpoint
-- Hand-written data migration: keep existing ownership as membership before the column goes.
INSERT INTO "upload_transactions" ("upload_id", "transaction_id") SELECT "upload_id", "id" FROM "transactions";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "upload_id";