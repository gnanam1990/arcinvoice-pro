import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load local env so DATABASE_URL is available to drizzle-kit CLI commands.
config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "[drizzle.config] DATABASE_URL is not set. Copy .env.example to .env.local before migrate/seed.",
  );
}

export default defineConfig({
  // Single entrypoint that re-exports all tables/enums (10 tables).
  schema: "./src/db/schema/index.ts",
  // Explicit committed migration directory (journal + snapshots + SQL).
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "",
  },
  strict: true,
  verbose: true,
});
