import { defineConfig } from "drizzle-kit";

// For local development we prefer a sqlite file. If DATABASE_URL is set,
// drizzle-kit will use it; otherwise fall back to a local sqlite file.
const defaultSqliteUrl = `file:./db/sqlite.db`;
const dbUrl = process.env.DATABASE_URL || defaultSqliteUrl;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  // Use sqlite for local dev fallback; drizzle-kit will infer driver from URL.
  dialect: dbUrl.startsWith('file:') ? 'sqlite' : 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});
