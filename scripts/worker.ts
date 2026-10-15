import { PgBoss } from "pg-boss";
import { runFollowUps } from "../src/lib/automation";
import { db } from "../src/lib/db";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const boss = new PgBoss(process.env.DATABASE_URL);
boss.on("error", error => console.error("Queue error", error.name));
await boss.start();
await boss.createQueue("follow-up-simulation", { retryLimit: 3, retryDelay: 60, retryBackoff: true, expireInSeconds: 300 });
await boss.schedule("follow-up-simulation", "*/15 * * * *", {}, { tz: "Asia/Karachi" });
await boss.work("follow-up-simulation", async () => {
  const result = await runFollowUps();
  console.log("Simulation completed", result);
});
console.log("Persistent follow-up worker ready. Simulation only; no external communications.");
async function stop() { await boss.stop(); await db.$disconnect(); process.exit(0); }
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
