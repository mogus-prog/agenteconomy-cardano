CREATE TABLE IF NOT EXISTS "agents" (
	"address" text PRIMARY KEY NOT NULL,
	"pub_key_hash" text,
	"reputation_utxo_ref" text,
	"total_completed" integer DEFAULT 0 NOT NULL,
	"total_disputed" integer DEFAULT 0 NOT NULL,
	"total_disputes_won" integer DEFAULT 0 NOT NULL,
	"success_rate_bps" integer DEFAULT 0 NOT NULL,
	"total_earned_lovelace" bigint NOT NULL,
	"avg_completion_ms" bigint,
	"category_scores" jsonb DEFAULT '{}'::jsonb,
	"profile_ipfs" text,
	"display_name" text,
	"last_active" timestamp with time zone,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rank_global" integer,
	"is_verified" boolean DEFAULT false,
	CONSTRAINT "agents_pub_key_hash_unique" UNIQUE("pub_key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"wallet_address" text,
	"user_id" text,
	"name" text,
	"scopes" text[],
	"rate_limit_rpm" integer DEFAULT 60,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bounties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utxo_ref" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description_ipfs" text NOT NULL,
	"category" text NOT NULL,
	"difficulty" text NOT NULL,
	"tags" text[] DEFAULT '{}',
	"result_schema_ipfs" text,
	"reward_lovelace" bigint NOT NULL,
	"reward_token_policy" text,
	"reward_token_name" text,
	"reward_token_amount" bigint,
	"bond_lovelace" bigint NOT NULL,
	"poster_address" text NOT NULL,
	"agent_address" text,
	"allowed_agents" text[],
	"deadline" timestamp with time zone NOT NULL,
	"claim_window_ms" bigint NOT NULL,
	"dispute_window_ms" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	"verification_type" text NOT NULL,
	"oracle_pub_key" text,
	"status" text DEFAULT 'open' NOT NULL,
	"result_ipfs" text,
	"payment_tx_hash" text,
	"post_tx_hash" text NOT NULL,
	"claim_tx_hash" text,
	"submit_tx_hash" text,
	"complete_tx_hash" text,
	CONSTRAINT "bounties_utxo_ref_unique" UNIQUE("utxo_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_id" uuid NOT NULL,
	"filed_by" text NOT NULL,
	"agent_address" text NOT NULL,
	"reason" text,
	"poster_evidence_ipfs" text,
	"agent_evidence_ipfs" text,
	"status" text DEFAULT 'pending',
	"resolution" text,
	"split_percentage" integer,
	"resolution_tx_hash" text,
	"filed_at" timestamp with time zone DEFAULT now(),
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient" text NOT NULL,
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"payload" jsonb NOT NULL,
	"delivered" boolean DEFAULT false,
	"retries" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spending_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"amount_lovelace" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	"spent_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"tx_hash" text PRIMARY KEY NOT NULL,
	"wallet_address" text,
	"direction" text NOT NULL,
	"amount_lovelace" bigint NOT NULL,
	"token_policy" text,
	"token_name" text,
	"token_amount" bigint,
	"counterparty" text,
	"bounty_id" uuid,
	"tx_type" text,
	"metadata" jsonb,
	"block_height" integer,
	"block_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
	"address" text PRIMARY KEY NOT NULL,
	"owner_pkh" text NOT NULL,
	"agent_pkh" text NOT NULL,
	"policy_utxo_ref" text,
	"daily_limit_lovelace" bigint,
	"per_tx_limit_lovelace" bigint,
	"whitelisted_scripts" text[],
	"whitelisted_addresses" text[],
	"require_owner_above" bigint,
	"is_paused" boolean DEFAULT false,
	"pause_until" timestamp with time zone,
	"cached_ada_balance" bigint,
	"balance_cached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_wallet_address_wallets_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."wallets"("address") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_address_wallets_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."wallets"("address") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bounties_status" ON "bounties" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bounties_category" ON "bounties" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bounties_deadline" ON "bounties" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bounties_poster" ON "bounties" USING btree ("poster_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bounties_agent" ON "bounties" USING btree ("agent_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_spending_wallet_time" ON "spending_events" USING btree ("wallet_address","spent_at");