import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { User, Task } from "@prisma/client";
import { db } from "../src/lib/db";
import { seedDemo } from "../prisma/seed";
import { createTask, actOnTask } from "../src/lib/tasks";
import { workspace, taskDetail } from "../src/lib/workspace";
import { saveEmployee, saveDepartment, setupCeo } from "../src/lib/organization";
import { canSeeTask } from "../src/lib/permissions";
import { hashPassword, verifyPassword, issueSession, resolveSession, digest, rateLimit } from "../src/lib/auth";
import { uploadEvidence } from "../src/lib/evidence";
import { runFollowUps } from "../src/lib/automation";
let users: Record<string,User>;
before(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  assert(url.pathname.endsWith("_test"),"Refusing to reset a non-test database.");
  await db.$executeRawUnsafe('TRUNCATE TABLE "Institution", "User", "LoginAttempt", "Bootstrap", "AutomationPolicy", "AuditLog" CASCADE');
  const token = process.env.SETUP_TOKEN;
  const ceo = await setupCeo({ token, email: "bootstrap@test.local", name: "Initial CEO", institution: "Test Organization", password: "Test-only-password-2026" });
  assert.equal(ceo.role,"CEO");
  await assert.rejects(() => setupCeo({ token, email: "another@test.local", name: "Second CEO", institution: "Other", password: "Test-only-password-2026" }), /already complete/);
  await db.$executeRawUnsafe('TRUNCATE TABLE "Institution", "User", "Bootstrap", "AutomationPolicy", "AuditLog" CASCADE');
  await seedDemo("Test-only-password-2026");
  users = Object.fromEntries((await db.user.findMany()).map(u => [u.email.split("@")[0],u]));
});
after(async () => { await db.$disconnect(); });
const due = (days = 7) => new Date(Date.now()+days*86400000).toISOString();
async function task(actor = users.ceo, executor = users.operations, extra: object = {}) {
  return createTask(actor,{ title: "Integration test assignment", instructions: "Complete the integration test requirements.", executorId: executor.id, dueAt: due(), ...extra });
}
async function progress(user: User, task: Task) {
  let current = await actOnTask(user,task.id,{ action: "status", status: "ACKNOWLEDGED", note: "Acknowledged test work.", version: task.version });
  return actOnTask(user,task.id,{ action: "status", status: "IN_PROGRESS", note: "Started test work.", version: current.version });
}
test("password hashes, hashed sessions, expiry and inactive accounts", async () => {
  const hash = await hashPassword("test-secret-password");
  assert(!hash.includes("test-secret-password"));
  assert(await verifyPassword("test-secret-password",hash));
  assert(!await verifyPassword("wrong-password",hash));
  const token = await issueSession(users.teacher.id);
  const stored = await db.session.findUniqueOrThrow({ where: { id: digest(token) } });
  assert.notEqual(stored.id,token);
  assert.equal((await resolveSession(token))?.id,users.teacher.id);
  await db.session.update({ where: { id: digest(token) }, data: { expiresAt: new Date(0) } });
  assert.equal(await resolveSession(token),null);
  const inactive = await issueSession(users.teacher.id);
  await db.user.update({ where: { id: users.teacher.id }, data: { active: false } });
  assert.equal(await resolveSession(inactive),null);
  await db.user.update({ where: { id: users.teacher.id }, data: { active: true } });
});
test("database-backed login throttling rejects repeated attempts", async () => {
  await rateLimit("test-rate-limit",1);
  await assert.rejects(() => rateLimit("test-rate-limit",1), /Too many attempts/);
});
test("confirmed hierarchy, Finance and Operations boundaries, Principals and Maintenance", async () => {
  assert.equal(users.finance.managerId,users.ceo.id);
  assert.equal(users.operations.managerId,users.ceo.id);
  assert.equal(users.accounts.managerId,users.finance.id);
  assert.equal(users.academic.role,"DEPARTMENT_HEAD");
  assert.match(users.academic.title,/Principal/);
  assert.equal(users.maintenance.managerId,users.hr.id);
  const departments = await db.department.findMany();
  const maintenance = departments.find(d => d.name === "Maintenance")!;
  assert.equal(departments.find(d => d.id === maintenance.parentId)?.name,"HR & Administration");
});
test("nested delegation preserves root, originating requester, accountable owner and formal reporting", async () => {
  const root = await task();
  const branch = await task(users.operations,users.hr,{ parentId: root.id, dueAt: due(6) });
  const leaf = await task(users.hr,users.maintenance,{ parentId: branch.id, dueAt: due(5) });
  assert.equal(leaf.rootId,root.id);
  assert.equal(leaf.accountableOwnerId,users.operations.id);
  assert.equal(leaf.originatingAssignerId,users.ceo.id);
  assert.equal(leaf.createdById,users.hr.id);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: users.maintenance.id } })).managerId,users.hr.id);
  assert(await db.activity.count({ where: { taskId: root.id } }) >= 2);
});
test("forbidden delegation, parent deadline, cross-institution and parent cycles fail", async () => {
  await assert.rejects(() => task(users.hr,users.accounts), /cannot assign/);
  await assert.rejects(() => task(users.technician,users.teacher), /cannot assign/);
  const root = await task();
  await assert.rejects(() => task(users.operations,users.hr,{ parentId: root.id, dueAt: due(8) }), /cannot exceed/);
  await assert.rejects(() => db.task.update({ where: { id: root.id }, data: { parentId: root.id } }), /immutable|Circular/);
  const other = await db.institution.create({ data: { name: "Other Institution" } });
  const employee = await db.user.create({ data: { email: "other@test.local", name: "Other Employee", title: "Employee", role: "EMPLOYEE", institutionId: other.id, passwordHash: users.teacher.passwordHash } });
  await assert.rejects(() => task(users.operations,employee), /cannot assign/);
});
test("direct CEO assignment preserves reporting and director visibility", async () => {
  const direct = await task(users.ceo,users.technician);
  assert.equal(direct.reportingManagerId,users.maintenance.id);
  const people = await db.user.findMany();
  assert(canSeeTask(users.operations,direct,people));
  assert(canSeeTask(users.hr,direct,people));
  assert(!canSeeTask(users.finance,direct,people));
  assert(!canSeeTask(users.teacher,direct,people));
});
test("workspace and task detail do not leak hashes, other employees' work or sensitive Finance", async () => {
  const result = await workspace(users.technician);
  assert(result.tasks.every(t => [t.executorId,t.accountableOwnerId,t.createdById,t.originatingAssignerId].includes(users.technician.id)));
  assert(!JSON.stringify(result).includes("passwordHash"));
  const finance = await db.task.findFirstOrThrow({ where: { sensitivity: "FINANCE" } });
  assert.equal(await taskDetail(users.operations,finance.id),null);
  assert.equal((await workspace(users.admin)).tasks.length,0);
  await assert.rejects(() => task(users.admin,users.teacher), /cannot assign/);
});
test("status machine, optimistic concurrency, evidence, human review and immutable history", async () => {
  let current = await task(users.ceo,users.teacher,{ requiredEvidence: "A report" });
  await assert.rejects(() => actOnTask(users.teacher,current.id,{ action: "status", status: "COMPLETED", note: "Skip review attempt.", version: current.version }), /not permitted/);
  current = await progress(users.teacher,current);
  await assert.rejects(() => actOnTask(users.teacher,current.id,{ action: "comment", note: "stale", version: 0 }), /changed/);
  await assert.rejects(() => actOnTask(users.teacher,current.id,{ action: "status", status: "SUBMITTED_FOR_REVIEW", note: "Submitting report.", version: current.version }), /Upload/);
  await uploadEvidence(users.teacher,current.id,new File(["Completed inspection report"],"report.txt",{ type: "text/plain" }));
  current = await db.task.findUniqueOrThrow({ where: { id: current.id } });
  current = await actOnTask(users.teacher,current.id,{ action: "status", status: "SUBMITTED_FOR_REVIEW", note: "Report ready to review.", version: current.version });
  await assert.rejects(() => actOnTask(users.teacher,current.id,{ action: "review", decision: "APPROVED", note: "Self approval attempt.", version: current.version }), /authorized manager/);
  current = await actOnTask(users.ceo,current.id,{ action: "review", decision: "CHANGES_REQUESTED", note: "Please clarify the final section.", version: current.version });
  current = await actOnTask(users.teacher,current.id,{ action: "status", status: "SUBMITTED_FOR_REVIEW", note: "Clarified the report section.", version: current.version });
  current = await actOnTask(users.ceo,current.id,{ action: "review", decision: "APPROVED", note: "Evidence verified and approved.", version: current.version });
  assert.equal(current.status,"COMPLETED");
  const history = await db.activity.findFirstOrThrow({ where: { taskId: current.id } });
  await assert.rejects(() => db.activity.update({ where: { id: history.id }, data: { message: "rewrite" } }), /append-only/);
  await assert.rejects(() => db.activity.delete({ where: { id: history.id } }), /append-only/);
  await assert.rejects(() => uploadEvidence(users.teacher,current.id,new File(["bad"],"fake.pdf",{ type: "application/pdf" })), /do not match/);
});
test("mandatory children block parent submission and child completion does not close parent", async () => {
  let root = await task();
  let child = await task(users.operations,users.hr,{ parentId: root.id, dueAt: due(5) });
  root = await progress(users.operations,root);
  await assert.rejects(() => actOnTask(users.operations,root.id,{ action: "status", status: "SUBMITTED_FOR_REVIEW", note: "Try premature parent submission.", version: root.version }), /mandatory subtasks/);
  child = await progress(users.hr,child);
  child = await actOnTask(users.hr,child.id,{ action: "status", status: "SUBMITTED_FOR_REVIEW", note: "Child work completed.", version: child.version });
  await actOnTask(users.operations,child.id,{ action: "review", decision: "APPROVED", note: "Verified child completion.", version: child.version });
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: root.id } })).status,"IN_PROGRESS");
});
test("deadline extension requires manager approval and retains parent bounds", async () => {
  let root = await task(users.ceo,users.teacher,{ dueAt: due(2) });
  root = await actOnTask(users.teacher,root.id,{ action: "extension", dueAt: due(4), note: "Need more time for verification.", version: root.version });
  const request = await db.deadlineRequest.findFirstOrThrow({ where: { taskId: root.id } });
  const original = root.dueAt;
  await assert.rejects(() => actOnTask(users.teacher,root.id,{ action: "extension-review", requestId: request.id, approve: true, note: "Approve my own request.", version: root.version }), /authorized reviewing manager/);
  root = await actOnTask(users.ceo,root.id,{ action: "extension-review", requestId: request.id, approve: true, note: "Extension approved for verification.", version: root.version });
  assert(root.dueAt > original);
});
test("organization edits reject cycles, unauthorized management and revoke sessions", async () => {
  const { passwordHash: _hash, createdAt: _created, ...input } = users.hr;
  await assert.rejects(() => saveEmployee(users.operations,{ ...input }), /Only the CEO/);
  await assert.rejects(() => saveEmployee(users.ceo,{ ...input, managerId: users.technician.id }), /cycle/);
  const token = await issueSession(users.hr.id);
  await saveEmployee(users.ceo,{ ...input, title: "HR & Administration Head" });
  assert.equal(await resolveSession(token),null);
  const departments = await db.department.findMany();
  const hr = departments.find(d => d.name === "HR & Administration")!;
  const maintenance = departments.find(d => d.name === "Maintenance")!;
  await assert.rejects(() => saveDepartment(users.ceo,{ ...hr, parentId: maintenance.id }), /cycle/);
  await assert.rejects(() => db.user.update({ where: { id: users.hr.id }, data: { managerId: users.technician.id } }), /Circular/);
});
test("follow-up simulation uses reporting chain, deduplicates retries and respects weekends", async () => {
  await db.automationPolicy.update({ where: { id: "default" }, data: { workingDays: [1,2,3,4,5], startHour: 9, endHour: 17, escalationHours: 24 } });
  const t = await task(users.ceo,users.technician,{ dueAt: "2026-10-12T04:00:00.000Z" });
  const monday = new Date("2026-10-16T06:00:00.000Z");
  const first = await runFollowUps(users.ceo,monday);
  assert(first.reminders > 0 && first.escalations > 0);
  const escalations = await db.escalation.findMany({ where: { taskId: t.id }, orderBy: { level: "asc" } });
  assert.equal(escalations[0].toUserId,users.maintenance.id);
  assert.equal(escalations[1].toUserId,users.hr.id);
  assert.equal(escalations[2].toUserId,users.operations.id);
  const second = await runFollowUps(users.ceo,monday);
  assert.equal(second.reminders,0); assert.equal(second.escalations,0);
  const weekend = await runFollowUps(users.ceo,new Date("2026-10-17T06:00:00.000Z"));
  assert.match(weekend.skipped ?? "",/working hours/);
  assert.equal((await db.notification.findFirstOrThrow({ where: { taskId: t.id, simulated: true } })).simulated,true);
  await assert.rejects(() => runFollowUps(users.operations,monday), /Only the CEO/);
});
test("drafts are private across detail, comment and evidence paths; reassignment does not publish", async () => {
  let draft = await task(users.ceo,users.operations,{ draft: true });
  assert.equal(await taskDetail(users.operations,draft.id),null);
  await assert.rejects(() => actOnTask(users.operations,draft.id,{ action: "comment", note: "Guessing a private draft.", version: draft.version }), /not found/);
  await assert.rejects(() => uploadEvidence(users.operations,draft.id,new File(["Draft probe"],"draft.txt",{ type: "text/plain" })), /not found/);
  draft = await actOnTask(users.ceo,draft.id,{ action: "reassign", executorId: users.hr.id, note: "Change draft executor before publication.", version: draft.version });
  assert.equal(draft.status,"DRAFT");
  assert.equal(await db.notification.count({ where: { taskId: draft.id } }),0);
  await assert.rejects(() => actOnTask(users.ceo,draft.id,{ action: "reassign", executorId: users.ceo.id, note: "Self reassignment attempt.", version: draft.version }), /outside your authority/);
  draft = await actOnTask(users.ceo,draft.id,{ action: "status", status: "ASSIGNED", note: "Publish the approved assignment.", version: draft.version });
  assert.equal(draft.status,"ASSIGNED");
  assert(await taskDetail(users.hr,draft.id));
});
test("unsupported approval bypass is rejected rather than silently ignored", async () => {
  await assert.rejects(() => task(users.ceo,users.teacher,{ approvalRequired: false }));
});
test("concurrent transitions accept one current version and preserve history", async () => {
  const current = await task(users.ceo,users.teacher);
  const results = await Promise.allSettled(["first","second"].map(note => actOnTask(users.teacher,current.id,{ action: "status", status: "ACKNOWLEDGED", note: `${note} concurrent acknowledgment`, version: current.version })));
  assert.equal(results.filter(r => r.status === "fulfilled").length,1);
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: current.id } })).version,1);
  assert.equal(await db.activity.count({ where: { taskId: current.id, type: "STATUS_CHANGED" } }),1);
});
test("authorized employee may manage reports; cross-department grants surface assignable staff", async () => {
  const { passwordHash: _h, createdAt: _c, ...input } = users.teacher;
  await saveEmployee(users.ceo,{ ...input, canDelegate: true, canCrossDepartment: true });
  const teacher = await db.user.findUniqueOrThrow({ where: { id: users.teacher.id } });
  const result = await workspace(teacher);
  assert(result.assignableIds.includes(users.technician.id));
  assert(result.people.some(p => p.id === users.technician.id));
  const staff = await saveEmployee(users.ceo,{ name: "Authorized employee report", email: "employee-report@test.local", title: "Assistant", password: "Test-only-password-2026", role: "EMPLOYEE", institutionId: teacher.institutionId, departmentId: teacher.departmentId, campusId: teacher.campusId, managerId: teacher.id, canDelegate: false });
  assert.equal(staff.managerId,teacher.id);
});
test("weekly completion count uses approval events rather than later comments", async () => {
  const institution = await db.institution.findUniqueOrThrow({ where: { id: users.ceo.institutionId } });
  const now = new Date();
  const old = new Date(now.getTime()-21*86400000);
  const id = randomUUID();
  await db.task.create({ data: { id, rootId: id, title: "Historical completed task", instructions: "Historical test fixture", executorId: users.teacher.id, accountableOwnerId: users.teacher.id, originatingAssignerId: users.ceo.id, createdById: users.ceo.id, institutionId: institution.id, status: "COMPLETED", dueAt: old, updatedAt: old, publishedAt: old } });
  await db.approval.create({ data: { taskId: id, reviewerId: users.ceo.id, decision: "APPROVED", note: "Historical test approval", createdAt: old } });
  const before = (await workspace(users.ceo)).metrics.completedThisWeek;
  await actOnTask(users.ceo,id,{ action: "comment", note: "Comment on historical completion.", version: 0 });
  assert.equal((await workspace(users.ceo)).metrics.completedThisWeek,before);
});
test("cancelled unpublished drafts remain private", async () => {
  let draft = await task(users.ceo,users.operations,{ draft: true });
  draft = await actOnTask(users.ceo,draft.id,{ action: "status", status: "CANCELLED", note: "Cancel the private draft.", version: draft.version });
  assert.equal(draft.publishedAt,null);
  assert.equal(await taskDetail(users.operations,draft.id),null);
  assert(!(await workspace(users.operations)).tasks.some(t => t.id === draft.id));
  await assert.rejects(() => actOnTask(users.operations,draft.id,{ action: "comment", note: "Private archive probe", version: draft.version }), /not found/);
});
