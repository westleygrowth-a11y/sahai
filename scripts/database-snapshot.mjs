import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Client } from "pg";
const action = process.argv[2];
if (!["save", "restore"].includes(action)) throw new Error("Specify save or restore.");
const url = new URL(process.env.DATABASE_URL);
const database = url.pathname.slice(1);
const user = decodeURIComponent(url.username);
if (!/^[a-z][a-z0-9_]*$/.test(database) || !user) throw new Error("Invalid local database configuration.");
const file = process.env.SAH_SNAPSHOT_PATH || ".local/database.sql";
await mkdir(".local", { recursive: true, mode: 0o700 });
function command(program, args) {
  const child = spawn("docker",["compose","exec","-T","db",program,"-U",user,"-d",database,...args],{ stdio: ["pipe","pipe","inherit"] });
  const done = new Promise((resolve,reject) => { child.on("error",reject); child.on("exit",code => code === 0 ? resolve() : reject(new Error(`${program} failed with exit code ${code}`))); });
  return { child, done };
}
if (action === "save") {
  const { child, done } = command("pg_dump",["--schema=public","--no-owner","--no-acl","--clean","--if-exists"]);
  child.stdin.end();
  await Promise.all([pipeline(child.stdout,createWriteStream(file+".tmp",{ mode: 0o600 })),done]);
  await rename(file+".tmp",file);
  console.log("Private database snapshot saved. Evidence files remain in .local/evidence; preserve both together.");
} else {
  if (!existsSync(file)) { console.log("No database snapshot present; migrations will initialize the database."); process.exit(0); }
  const client = new Client({ connectionString: url.href });
  await client.connect();
  const result = await client.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
  await client.end();
  if (result.rows[0].count > 0) { console.log("Existing database preserved; no snapshot restore performed."); process.exit(0); }
  const { child, done } = command("psql",["--set","ON_ERROR_STOP=1","--single-transaction","--quiet"]);
  child.stdout.resume();
  await Promise.all([pipeline(createReadStream(file),child.stdin),done]);
  console.log("Database snapshot restored into an empty local database.");
}
