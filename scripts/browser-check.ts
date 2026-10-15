import { chromium, expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
const original = process.env.DATABASE_URL!;
const testUrl = new URL(original); testUrl.pathname = "/sahai_browser_test";
if (testUrl.href === original) throw new Error("Browser checks require an isolated test database.");
const admin = new Client({ connectionString: original }); await admin.connect();
if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname = 'sahai_browser_test'")).rowCount) await admin.query('CREATE DATABASE "sahai_browser_test"');
await admin.end();
const base = "http://localhost:3100";
const password = randomBytes(20).toString("base64url");
const setupToken = randomBytes(32).toString("hex");
process.env.DATABASE_URL = testUrl.href;
process.env.APP_URL = base;
process.env.SETUP_TOKEN = setupToken;
const env = { ...process.env, NEXT_DIST_DIR: ".next-browser", NEXT_TELEMETRY_DISABLED: "1" };
const migration = spawnSync("npx", ["--no-install","prisma","migrate","deploy"], { env, stdio: "inherit" });
if (migration.status !== 0) process.exit(migration.status ?? 1);
const { db } = await import("../src/lib/db");
const { seedDemo } = await import("../prisma/seed");
async function reset() {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")) throw new Error("Unsafe test database.");
  await db.$executeRawUnsafe('TRUNCATE TABLE "Institution", "User", "LoginAttempt", "Bootstrap", "AutomationPolicy", "AuditLog" CASCADE');
}
await reset();
// Test the production build; isolate its output from the developer's dev server.
const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env: { ...env, NODE_ENV: "production" }, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);
let logs = "";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"], { env: { ...env, NODE_ENV: "production" }, stdio: ["ignore","pipe","pipe"] });
server.stdout.on("data", b => { logs += String(b); }); server.stderr.on("data", b => { logs += String(b); });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const errors: string[] = [];
const results: string[] = [];
await mkdir("output/playwright",{ recursive: true });
for (const name of ["results.json", "server.log", "browser-errors.json"]) await rm(`output/playwright/${name}`,{ force: true });
try {
  let ready = false;
  for (let attempt=0;attempt<120;attempt++) {
    try { const r = await fetch(base+"/api/setup"); if (r.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error("Test server exited before readiness.");
    await new Promise(resolve => setTimeout(resolve,500));
  }
  if (!ready) throw new Error("Test server readiness timed out.");
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ?? (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: executablePath ? ["--no-sandbox","--disable-dev-shm-usage"] : [] });
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  const page = await context.newPage();
  page.on("pageerror",e => errors.push(e.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(base+"/setup");
  await page.getByLabel("CEO name").fill("Browser Setup CEO");
  await page.getByLabel("Institution name").fill("Browser Setup Institution");
  await page.getByLabel("Email",{ exact: true }).fill("bootstrap@browser.test");
  await page.getByLabel("Password",{ exact: true }).fill(password);
  await page.getByLabel("Private setup token").fill(setupToken);
  await page.getByRole("button",{ name: "Create CEO account" }).click();
  await expect(page.getByRole("heading",{ name: "Command center",exact:true })).toBeVisible();
  await page.goto(base+"/setup");
  await expect(page.getByRole("heading",{ name: "Workspace initialized" })).toBeVisible();
  results.push("Initial CEO setup works and closes after initialization.");
  await context.clearCookies();
  await reset();
  await seedDemo(password);
  async function login(role: string, target = page) {
    await target.context().clearCookies();
    await target.goto(base+"/login");
    await target.getByLabel("Email",{ exact: true }).fill(`${role}@demo.sah.local`);
    await target.getByLabel("Password",{ exact: true }).fill(password);
    await target.getByRole("button",{ name: "Sign in",exact:true }).click();
    await expect(target.getByRole("heading",{ level: 1 })).not.toHaveText("Welcome back");
    await expect(target.getByRole("navigation",{ name: "Main navigation" })).toBeVisible();
  }
  await login("ceo");
  await mkdir("output/playwright",{ recursive: true });
  await page.screenshot({ path: "output/playwright/ceo-desktop.png", fullPage: true });
  const direct = await page.request.post(base+"/api/tasks",{ headers: { origin: "https://foreign.example" }, data: {} });
  expect(direct.status()).toBe(403);
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(base+"/api/workspace")).status()).toBe(401);
  await anonymous.close();
  results.push("Authenticated dashboard renders; anonymous and cross-origin requests are rejected.");
  const dueLocal = new Date(Date.now()+7*86400000+5*3600000).toISOString().slice(0,16);
  async function fillTask(title: string, executor: string) {
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Task title",{exact:true}).fill(title);
    await dialog.getByLabel("Detailed instructions").fill("Browser-verified assignment. Follow the formal reporting hierarchy.");
    await dialog.getByLabel("Assigned executor").selectOption({ label: executor });
    await dialog.getByLabel("Due date & time · Asia/Karachi").fill(dueLocal);
    await dialog.getByRole("button",{ name: /^(Create task|Delegate subtask)$/ }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.getByRole("button",{ name: "New task",exact:true }).click();
  await fillTask("Browser QA inspection", "Demo Operations Director · Operations Director");
  await expect(page.getByRole("button",{ name: "Browser QA inspection",exact:true }).first()).toBeVisible();
  results.push("CEO creates a persistent assignment through the UI.");
  await login("operations");
  await page.getByRole("button",{ name: "Browser QA inspection",exact:true }).first().click();
  await page.getByRole("dialog").getByRole("button",{ name: "Delegate",exact:true }).click();
  await fillTask("Browser QA facilities", "Demo HR Head · HR & Administration Head");
  await login("hr");
  await page.getByRole("button",{ name: "Browser QA facilities",exact:true }).first().click();
  await page.getByRole("dialog").getByRole("button",{ name: "Delegate",exact:true }).click();
  await fillTask("Browser QA repairs", "Demo Maintenance Supervisor · Maintenance Supervisor");
  await login("maintenance");
  await page.getByRole("button",{ name: "Browser QA repairs",exact:true }).first().click();
  await page.getByRole("dialog").getByRole("button",{ name: "Delegate",exact:true }).click();
  await fillTask("Browser QA technician job", "Demo Technician · Maintenance Technician");
  results.push("Operations → HR → Maintenance → Technician nested delegation works through the UI.");
  await login("technician");
  await expect(page.getByRole("button",{ name: "Reconcile monthly accounts",exact:true })).toHaveCount(0);
  await page.getByRole("button",{ name: "Browser QA technician job",exact:true }).first().click();
  await page.getByRole("dialog").getByLabel("Upload evidence",{ exact:true }).setInputFiles({ name: "browser-report.txt", mimeType: "text/plain", buffer: Buffer.from("Browser-verified evidence upload.") });
  await page.getByRole("dialog").getByRole("button",{ name: "Upload evidence",exact:true }).last().click();
  await expect(page.getByRole("dialog").getByRole("link",{ name: /browser-report.txt/ })).toBeVisible();
  results.push("Evidence upload reaches protected storage and renders an authorized download link.");
  for (const [status,note] of [["ACKNOWLEDGED","I acknowledge this assignment."],["IN_PROGRESS","Inspection is in progress."],["SUBMITTED_FOR_REVIEW","Work completed for review."]]) {
    await page.getByRole("dialog").getByLabel("Action",{exact:true}).selectOption(status);
    await page.getByRole("dialog").getByLabel("Update / reason").fill(note);
    await page.getByRole("dialog").getByRole("button",{ name: "Save update",exact:true }).click();
    await expect(page.getByRole("status")).toHaveText("Task updated. Activity recorded.");
    await expect(page.getByRole("dialog").getByText(note,{exact:true})).toBeVisible();
  }
  await page.getByRole("dialog").getByRole("button",{ name: "Close",exact:true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "output/playwright/employee-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  results.push("Employee statuses persist with visible history; mobile has no page overflow and hides unrelated Finance work.");
  await page.setViewportSize({ width: 1536, height: 1024 });
  await login("maintenance");
  await page.getByRole("button",{ name: "Browser QA technician job",exact:true }).first().click();
  await page.getByRole("dialog").getByLabel("Action",{exact:true}).selectOption("APPROVED");
  await page.getByRole("dialog").getByLabel("Update / reason").fill("Evidence reviewed; approved by supervisor.");
  await page.getByRole("dialog").getByRole("button",{ name: "Save update",exact:true }).click();
  await expect(page.getByRole("dialog").getByText("Completed",{exact:true}).first()).toBeVisible();
  results.push("Supervisor approves submitted work through the UI.");
  await page.getByRole("dialog").getByRole("button",{ name: "Close",exact:true }).click();
  await login("ceo");
  await page.getByRole("button",{ name: "Organization",exact:true }).click();
  await page.getByRole("button",{ name: "Add employee",exact:true }).click();
  const employeeForm = page.getByRole("dialog");
  await employeeForm.getByLabel("Full name").fill("Browser QA Staff");
  await employeeForm.getByLabel("Email",{exact:true}).fill("browser-staff@test.local");
  await employeeForm.getByLabel("Job title").fill("Laboratory Assistant");
  await employeeForm.getByLabel("Reports to",{exact:true}).selectOption({ label: "Demo IT Head · IT Head" });
  await employeeForm.getByLabel("Initial password · minimum 12 characters").fill(password);
  await employeeForm.getByRole("button",{ name: "Save employee",exact:true }).click();
  await expect(employeeForm).not.toBeVisible();
  await expect(page.getByRole("heading",{ name: "Browser QA Staff",exact:true })).toBeVisible();
  results.push("CEO can add employee records in the configurable hierarchy.");
  await login("admin");
  await expect(page.getByRole("heading",{ name: "Organization",exact:true })).toBeVisible();
  const adminData = await (await page.request.get(base+"/api/workspace")).json();
  expect(adminData.tasks.length).toBe(0);
  results.push("System administrator has organization tools without management task access.");
  expect(errors).toEqual([]);
  await writeFile("output/playwright/results.json",JSON.stringify({ passed: results, pageErrors: errors, browser: executablePath ?? "Playwright Chromium", isolatedDatabase: "sahai_browser_test" },null,2));
  console.log(`PASS: ${results.length} browser/API workflows; no browser runtime errors.`);
} catch(error) {
  await mkdir("output/playwright",{ recursive: true });
  await writeFile("output/playwright/server.log",logs);
  await writeFile("output/playwright/browser-errors.json",JSON.stringify(errors,null,2));
  throw error;
} finally {
  await browser?.close(); server.kill("SIGTERM"); await db.$disconnect();
}
