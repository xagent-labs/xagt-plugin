/**
 * PhylaX Postgres schema using Drizzle ORM.
 *
 * Tables: users, conversations, approvals, quotes, executions, audit_log
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  privyUserId: text("privy_user_id").notNull().unique(),
  walletAddress: text("wallet_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Conversations ────────────────────────────────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    privyUserId: text("privy_user_id").notNull(),
    walletAddress: text("wallet_address").notNull(),
    title: text("title").notNull().default("New Chat"),
    selectedChain: text("selected_chain").notNull().default("x-layer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("idx_conversations_user").on(table.privyUserId)]
);

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id),
    role: text("role").notNull(), // user | assistant | system
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    toolCalls: jsonb("tool_calls"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_messages_conversation").on(table.conversationId)]
);

// ─── Quotes ───────────────────────────────────────────────────────────────────

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id"),
    privyUserId: text("privy_user_id").notNull(),
    walletAddress: text("wallet_address").notNull(),
    chainId: text("chain_id").notNull(),
    fromToken: text("from_token").notNull(),
    fromSymbol: text("from_symbol").notNull(),
    toToken: text("to_token").notNull(),
    toSymbol: text("to_symbol").notNull(),
    amountUsd: numeric("amount_usd").notNull(),
    expectedOutputUsd: numeric("expected_output_usd"),
    slippage: numeric("slippage"),
    gasFeeUsd: numeric("gas_fee_usd"),
    route: text("route"),
    /** Full OKX quote response snapshot */
    quoteSnapshot: jsonb("quote_snapshot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Quote expires after this time */
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("idx_quotes_wallet").on(table.walletAddress)]
);

// ─── Approvals ────────────────────────────────────────────────────────────────

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id").notNull(),
    privyUserId: text("privy_user_id").notNull(),
    walletAddress: text("wallet_address").notNull(),
    chainId: text("chain_id").notNull(),
    fromToken: text("from_token").notNull(),
    toToken: text("to_token").notNull(),
    amountUsd: numeric("amount_usd").notNull(),
    maxSlippagePercent: numeric("max_slippage_percent").notNull(),
    /** Whether this approval has been consumed (one-time-use) */
    consumed: boolean("consumed").default(false).notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("idx_approvals_wallet").on(table.walletAddress),
    index("idx_approvals_quote").on(table.quoteId),
  ]
);

// ─── Executions ───────────────────────────────────────────────────────────────

export const executions = pgTable(
  "executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    approvalId: uuid("approval_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    privyUserId: text("privy_user_id").notNull(),
    walletAddress: text("wallet_address").notNull(),
    chainId: text("chain_id").notNull(),
    fromToken: text("from_token").notNull(),
    toToken: text("to_token").notNull(),
    amountUsd: numeric("amount_usd").notNull(),
    /** unsigned tx returned to client */
    unsignedTx: jsonb("unsigned_tx"),
    /** tx hash after wallet signs and submits */
    txHash: text("tx_hash"),
    /** pending | unsigned_tx_created | submitted | confirmed | failed | reverted */
    status: text("status").notNull().default("pending"),
    /** Block number if confirmed */
    blockNumber: integer("block_number"),
    /** Gas used */
    gasUsed: text("gas_used"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_executions_wallet").on(table.walletAddress),
    index("idx_executions_tx").on(table.txHash),
    index("idx_executions_approval").on(table.approvalId),
  ]
);

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event: text("event").notNull(),
    privyUserId: text("privy_user_id"),
    walletAddress: text("wallet_address"),
    /** Arbitrary metadata for this event */
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_event").on(table.event),
    index("idx_audit_wallet").on(table.walletAddress),
    index("idx_audit_time").on(table.timestamp),
  ]
);
