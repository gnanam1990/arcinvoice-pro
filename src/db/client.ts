import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export type DbClient = {
  db: Database;
  /** Underlying postgres.js client — call `sql.end()` in scripts to exit cleanly. */
  sql: Sql;
};

const globalForDb = globalThis as unknown as {
  arcinvoiceSql?: Sql;
  arcinvoiceDb?: Database;
};

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and configure PostgreSQL.",
    );
  }
  return url;
}

/**
 * Create a one-off Postgres + Drizzle pair (scripts, tests).
 * Callers that own the process lifecycle should `await sql.end()`.
 */
export function createDbClient(
  connectionString = requireDatabaseUrl(),
): DbClient {
  const sql = postgres(connectionString, {
    max: 10,
    prepare: false,
  });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

/** @deprecated Prefer createDbClient when you need to close the pool (CLI scripts). */
export function createDb(connectionString = requireDatabaseUrl()): Database {
  return createDbClient(connectionString).db;
}

/**
 * Shared Postgres + Drizzle client for the Next.js app.
 * Reuses the connection on the module global in development.
 */
export function getDb(): Database {
  if (globalForDb.arcinvoiceDb) {
    return globalForDb.arcinvoiceDb;
  }

  const { db, sql } = createDbClient(requireDatabaseUrl());

  if (process.env.NODE_ENV !== "production") {
    globalForDb.arcinvoiceSql = sql;
    globalForDb.arcinvoiceDb = db;
  }

  return db;
}

export { schema };
