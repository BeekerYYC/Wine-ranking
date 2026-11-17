/**
 * Apply the Prisma schema to the database during a build — production only.
 *
 * The build used to run `prisma db push` on every Vercel deployment, previews
 * included, and previews use the same database as production. So a branch that
 * changed the schema altered the real database before it was ever merged — and
 * a branch built on an older schema tried to drop live columns (Prisma refused,
 * which is what failed that preview build).
 *
 * Vercel sets VERCEL_ENV to "production", "preview" or "development". Outside
 * Vercel (a local build) it is unset and the push runs as before, against
 * whatever database your local env points at.
 *
 * Previews therefore can't exercise schema changes unless they get their own
 * database: point POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING at a separate
 * database for the Preview environment in Vercel, and set PRISMA_PUSH_IN_PREVIEW=1.
 */
import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
if (env && env !== "production" && process.env.PRISMA_PUSH_IN_PREVIEW !== "1") {
  console.log(`[db-push] Skipping prisma db push for a ${env} deployment — previews share the production database.`);
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
