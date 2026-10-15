import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { AppError, requireThat } from "@/lib/errors";
import { SESSION_COOKIE, digest, hashPassword, issueSession, rateLimit, requireUser, sessionOptions, verifyPassword } from "@/lib/auth";
import { addLocation, saveDepartment, saveEmployee, setupCeo } from "@/lib/organization";
import { workspace, taskDetail } from "@/lib/workspace";
import { actOnTask, createTask } from "@/lib/tasks";
import { briefing, runFollowUps, savePolicy } from "@/lib/automation";
import { canSeeTask } from "@/lib/permissions";
import { evidenceDir, uploadEvidence } from "@/lib/evidence";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const credentials = z.object({ email: z.email().max(254).transform(s => s.toLowerCase()), password: z.string().min(1).max(128) });
async function bodyBytes(req: Request, limit = 100000) {
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      requireThat(size <= limit, 413, "Request is too large.");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
async function json(req: Request) {
  try { return JSON.parse(Buffer.from(await bodyBytes(req)).toString("utf8")); }
  catch (error) { if (error instanceof AppError) throw error; throw new AppError(400, "Send a valid JSON body."); }
}
type Context = { params: Promise<{ path: string[] }> };
async function handle(req: NextRequest, context: Context) {
  try {
    if (req.method !== "GET") {
      requireThat(process.env.APP_URL, 503, "APP_URL must be configured.");
      requireThat(req.headers.get("origin") === new URL(process.env.APP_URL).origin, 403, "Request origin is not allowed.");
      requireThat(req.headers.get("sec-fetch-site") !== "cross-site", 403, "Cross-site mutation is not allowed.");
    }
    const { path } = await context.params;
    const route = path.join("/");
    const send = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
    if (route === "setup" && req.method === "GET") return send({ configured: !!await db.bootstrap.findUnique({ where: { id: "initial-ceo" } }) });
    if (route === "setup" && req.method === "POST") {
      await rateLimit("initial-setup", 10);
      const user = await setupCeo(await json(req));
      const token = await issueSession(user.id);
      const response = send({ ok: true }, 201);
      response.cookies.set(SESSION_COOKIE, token, sessionOptions());
      return response;
    }
    if (route === "login" && req.method === "POST") {
      const data = credentials.parse(await json(req));
      await rateLimit(`login:${data.email}`);
      await rateLimit("login:global", 200);
      const user = await db.user.findUnique({ where: { email: data.email } });
      const valid = await verifyPassword(data.password, user?.passwordHash ?? await hashPassword("non-account-timing-placeholder"));
      requireThat(user?.active && valid, 401, "Email or password is incorrect.");
      const token = await issueSession(user.id);
      const response = send({ ok: true });
      response.cookies.set(SESSION_COOKIE, token, sessionOptions());
      return response;
    }
    const actor = await requireUser();
    if (route === "logout" && req.method === "POST") {
      const token = req.cookies.get(SESSION_COOKIE)?.value;
      if (token) await db.session.deleteMany({ where: { id: digest(token) } });
      const response = send({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", { ...sessionOptions(), maxAge: 0 });
      return response;
    }
    if (route === "workspace" && req.method === "GET") return send(await workspace(actor));
    if (route === "organization/employees" && req.method === "POST") return send(await saveEmployee(actor, await json(req)), 201);
    if (route === "organization/departments" && req.method === "POST") return send(await saveDepartment(actor, await json(req)));
    if (route === "organization/locations" && req.method === "POST") return send(await addLocation(actor, await json(req)), 201);
    if (route === "tasks" && req.method === "POST") return send(await createTask(actor, await json(req)), 201);
    if (path[0] === "tasks" && path.length === 2 && req.method === "GET") {
      const task = await taskDetail(actor, z.uuid().parse(path[1]));
      requireThat(task, 404, "Task not found."); return send(task);
    }
    if (path[0] === "tasks" && path.length === 2 && req.method === "PATCH") return send(await actOnTask(actor, z.uuid().parse(path[1]), await json(req)));
    if (path[0] === "tasks" && path.length === 3 && path[2] === "evidence" && req.method === "POST") {
      const bytes = await bodyBytes(req, 2200000);
      const form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": req.headers.get("content-type") ?? "" } }).formData();
      const file = form.get("file"); requireThat(file instanceof File, 400, "Choose an evidence file.");
      return send(await uploadEvidence(actor, z.uuid().parse(path[1]), file), 201);
    }
    if (path[0] === "evidence" && path.length === 2 && req.method === "GET") {
      const attachment = await db.attachment.findUnique({ where: { id: z.uuid().parse(path[1]) }, include: { task: true } });
      requireThat(attachment && canSeeTask(actor, attachment.task, await db.user.findMany()), 404, "Evidence not found.");
      const buffer = await readFile(join(evidenceDir(), attachment.storageKey));
      return new Response(new Uint8Array(buffer), { headers: { "Content-Type": attachment.mediaType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    if (route === "notifications/read" && req.method === "POST") {
      const { id } = z.object({ id: z.uuid() }).parse(await json(req));
      await db.notification.updateMany({ where: { id, userId: actor.id }, data: { readAt: new Date() } }); return send({ ok: true });
    }
    if (route === "automation/run" && req.method === "POST") return send(await runFollowUps(actor));
    if (route === "automation/policy" && req.method === "POST") return send(await savePolicy(actor, await json(req)));
    if (route === "briefing" && req.method === "GET") return send(await briefing(actor));
    throw new AppError(404, "Endpoint not found.");
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This record already exists." }, { status: 409 });
    console.error("SAH request failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "The request could not be completed. Please try again." }, { status: 500 });
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
