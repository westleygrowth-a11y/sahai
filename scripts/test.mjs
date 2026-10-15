import { Client } from "pg";
import { spawnSync } from "node:child_process";
const base = new URL(process.env.DATABASE_URL);
const testUrl = new URL(process.env.TEST_DATABASE_URL || base);
if (!process.env.TEST_DATABASE_URL) testUrl.pathname = "/sahai_test";
const testName = testUrl.pathname.slice(1);
if (!/^[a-z][a-z0-9_]*_test$/.test(testName) || testUrl.href === base.href) throw new Error("Tests require a separate database with a name ending in _test.");
const admin = new Client({ connectionString: base.href });
await admin.connect();
const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [testName]);
if (!exists.rowCount) await admin.query(`CREATE DATABASE "${testName}"`);
await admin.end();
const env = { ...process.env, DATABASE_URL: testUrl.href, NODE_ENV: "test" };
for (const args of [["prisma", "migrate", "deploy"], ["tsx", "--test", "--test-concurrency=1", "tests/domain.test.ts", "tests/integration.test.ts"]]) {
  const r = spawnSync("npx", ["--no-install", ...args], { env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
