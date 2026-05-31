/**
 * PhylaX Postgres database client (Drizzle ORM).
 *
 * Env: DATABASE_URL (Postgres connection string)
 *
 * If DATABASE_URL is not set:
 * - Production: operations that require DB will fail closed
 * - Dev: returns null client with clear warning
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: pg.Pool | null = null;
let _initAttempted = false;
let _initError: string | null = null;

export function getDb() {
  if (typeof global !== "undefined" && (global as any).__mockGetDb !== undefined) {
    return (global as any).__mockGetDb();
  }
  if (_db) return _db;
  if (_initAttempted) return null;
  _initAttempted = true;

  const url = process.env.DATABASE_URL;
  if (!url) {
    _initError = "DATABASE_URL is not set. Postgres persistence is unavailable.";
    console.warn(`[db] ${_initError}`);
    return null;
  }

  try {
    _pool = new pg.Pool({ connectionString: url, max: 10 });
    _db = drizzle(_pool, { schema });
    return _db;
  } catch (err) {
    _initError = `Failed to initialize Postgres: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[db] ${_initError}`);
    return null;
  }
}

export function getDbError(): string | null {
  return _initError;
}

export function isDbAvailable(): boolean {
  return getDb() !== null;
}

export { schema };
