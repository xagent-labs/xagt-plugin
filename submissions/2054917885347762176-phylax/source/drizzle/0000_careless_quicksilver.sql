CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"privy_user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"chain_id" text NOT NULL,
	"from_token" text NOT NULL,
	"to_token" text NOT NULL,
	"amount_usd" numeric NOT NULL,
	"max_slippage_percent" numeric NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"privy_user_id" text,
	"wallet_address" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"selected_chain" text DEFAULT 'x-layer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"privy_user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"chain_id" text NOT NULL,
	"from_token" text NOT NULL,
	"to_token" text NOT NULL,
	"amount_usd" numeric NOT NULL,
	"unsigned_tx" jsonb,
	"tx_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"block_number" integer,
	"gas_used" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"privy_user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"chain_id" text NOT NULL,
	"from_token" text NOT NULL,
	"from_symbol" text NOT NULL,
	"to_token" text NOT NULL,
	"to_symbol" text NOT NULL,
	"amount_usd" numeric NOT NULL,
	"expected_output_usd" numeric,
	"slippage" numeric,
	"gas_fee_usd" numeric,
	"route" text,
	"quote_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_privy_user_id_unique" UNIQUE("privy_user_id")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approvals_wallet" ON "approvals" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_approvals_quote" ON "approvals" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "idx_audit_event" ON "audit_log" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_audit_wallet" ON "audit_log" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_audit_time" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_conversations_user" ON "conversations" USING btree ("privy_user_id");--> statement-breakpoint
CREATE INDEX "idx_executions_wallet" ON "executions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "idx_executions_tx" ON "executions" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "idx_executions_approval" ON "executions" USING btree ("approval_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_wallet" ON "quotes" USING btree ("wallet_address");