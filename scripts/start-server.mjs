import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
/** @param {Record<string, string | undefined>} [env] */
export function validateDatabase(env = process.env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is missing. Add PostgreSQL in Railway and reference its DATABASE_URL in the app service Variables.");
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  if ((env.RAILWAY_ENVIRONMENT_ID || env.RAILWAY_PROJECT_ID) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Railway cannot use the local development database. Reference the Railway Postgres service DATABASE_URL.");
  }
}
export function launch() {
  try { validateDatabase(); } catch (error) { console.error(error.message); process.exitCode = 1; return; }
  console.log("Applying database migrations before starting SAH AI. Existing data will be preserved.");
  const migration = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], { stdio: "inherit" });
  if (migration.status !== 0) {
    console.error("Database setup failed. Check the Railway PostgreSQL service and DATABASE_URL; the web server was not started.");
    process.exitCode = migration.status || 1; return;
  }
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "0.0.0.0"], { stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", () => { console.error("SAH AI web server could not start."); process.exitCode = 1; });
  child.on("exit", code => { process.exitCode = code ?? 0; });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) launch();
