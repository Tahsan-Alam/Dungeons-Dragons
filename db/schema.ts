import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const aiLedger = sqliteTable('ai_ledger', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull(),
  payload: text('payload').notNull(),
},table=>[check('ai_ledger_singleton',sql`${table.id} = 1`)]);

// The revision is an internal compare-and-swap counter, separate from the
// visible game version. Presence updates therefore cannot overwrite a turn.
export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(),
  revision: integer('revision').notNull(),
  payload: text('payload').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('rooms_expiry_idx').on(table.expiresAt)]);

export const roomRateLimits = sqliteTable('room_rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('room_rate_limits_expiry_idx').on(table.expiresAt)]);
