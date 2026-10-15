import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
if (existsSync(".env")) {
  console.log("Keeping existing .env; no settings overwritten.");
} else {
  const password = randomBytes(24).toString("hex");
  const token = randomBytes(32).toString("hex");
  const demo = randomBytes(18).toString("base64url");
  writeFileSync(".env", `DATABASE_URL=postgresql://sah:${password}@localhost:5434/sahai\nPOSTGRES_USER=sah\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=sahai\nAPP_URL=http://localhost:3000\nSETUP_TOKEN=${token}\nSESSION_COOKIE_SECURE=false\nALLOW_DEMO_SEED=true\nDEMO_PASSWORD=${demo}\nAI_MODE=simulation\n`, { mode: 0o600 });
  mkdirSync(".local", { recursive: true, mode: 0o700 });
  writeFileSync(".local/access.txt", `LOCAL DEVELOPMENT ONLY. Do not commit or share.\nCEO setup token: ${token}\nDemo CEO email: ceo@demo.sah.local\nDemo account password: ${demo}\nOther demo role emails are listed in README.md.\n`, { mode: 0o600 });
  console.log("Created private local configuration. Access details are in ignored .local/access.txt; no credentials printed.");
}
