import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { User, Task, AutomationPolicy } from "@prisma/client";
import { reportIds, canAssign, canSeeTask, assertNoReportingCycle } from "../src/lib/permissions";
import { withinWorkingHours } from "../src/lib/automation";
import { localParts, startOfWeek } from "../src/lib/time";
import { appOrigin } from "../src/lib/environment";
import { validateDatabase } from "../scripts/start-server.mjs";
const person = (overrides: Partial<User> = {}) => ({ id: randomUUID(), institutionId: "sah", active: true, role: "EMPLOYEE", canDelegate: false, canCrossDepartment: false, canAccessHr: false, canAccessFinance: false, managerId: null, ...overrides } as User);
test("nested reporting and explicit delegation grant; CEO bypass never changes reporting", () => {
  const ceo = person({ role: "CEO" });
  const head = person({ role: "DEPARTMENT_HEAD", canDelegate: true, managerId: ceo.id });
  const supervisor = person({ role: "SUPERVISOR", canDelegate: true, managerId: head.id });
  const employee = person({ managerId: supervisor.id });
  const outside = person({ managerId: ceo.id });
  const people = [ceo,head,supervisor,employee,outside];
  assert(reportIds(head,people).has(employee.id));
  assert(canAssign(head,employee,people));
  assert(!canAssign(employee,outside,people));
  assert(!canAssign(head,outside,people));
  assert(canAssign(ceo,employee,people));
  assert.equal(employee.managerId,supervisor.id);
});
test("cycle validation has no arbitrary fixed depth", () => {
  const chain = Array.from({ length: 200 }, (_,i) => ({ id: String(i), managerId: i ? String(i-1) : null }));
  assert.doesNotThrow(() => assertNoReportingCycle("new", "199", chain));
  assert.throws(() => assertNoReportingCycle("0", "199", chain), /cycle/);
  assert.throws(() => assertNoReportingCycle("new", "missing", chain), /does not exist/);
});
test("technical administration and sensitive data access are separate", () => {
  const admin = person({ role: "SYSTEM_ADMIN" });
  const employee = person();
  const hr = person({ role: "DEPARTMENT_HEAD", canAccessHr: true });
  const task = { executorId: employee.id, accountableOwnerId: employee.id, createdById: hr.id, originatingAssignerId: hr.id, institutionId: "sah", sensitivity: "HR", publishedAt: new Date() } as Task;
  assert(!canSeeTask(admin,task,[admin,employee,hr]));
  assert(!canSeeTask(employee,task,[employee,hr]));
  assert(canSeeTask(hr,task,[employee,hr]));
});
test("inactive managers do not hide active descendants from division oversight", () => {
  const director = person({ role: "OPERATIONS_DIRECTOR", canDelegate: true });
  const formerHead = person({ active: false, managerId: director.id });
  const staff = person({ managerId: formerHead.id });
  assert(reportIds(director,[director,formerHead,staff]).has(staff.id));
  assert(canAssign(director,staff,[director,formerHead,staff]));
});
test("Karachi working windows, Friday boundaries, holidays and weekends", () => {
  const policy = { timezone: "Asia/Karachi", workingDays: [1,2,3,4,5], startHour: 9, endHour: 17, holidays: [] } as unknown as AutomationPolicy;
  assert(withinWorkingHours(new Date("2026-10-16T04:00:00Z"),policy));
  assert(!withinWorkingHours(new Date("2026-10-16T12:00:00Z"),policy));
  assert(!withinWorkingHours(new Date("2026-10-17T06:00:00Z"),policy));
  assert(!withinWorkingHours(new Date("2026-10-16T06:00:00Z"),{ ...policy, holidays: ["2026-10-16"] }));
  assert.equal(localParts(new Date("2026-10-15T20:00:00Z")).day,"2026-10-16");
  assert.equal(startOfWeek(new Date("2026-10-18T10:00:00Z")).toISOString(),"2026-10-11T19:00:00.000Z");
});
test("Railway origin comes from configured platform metadata, with explicit URL override", () => {
  assert.equal(appOrigin({ RAILWAY_PUBLIC_DOMAIN: "sahai-production-2981.up.railway.app" }),"https://sahai-production-2981.up.railway.app");
  assert.equal(appOrigin({ APP_URL: "https://ops.example.com/", RAILWAY_PUBLIC_DOMAIN: "other.example.com" }),"https://ops.example.com");
  assert.equal(appOrigin({ APP_URL: "not a url" }),undefined);
  assert.equal(appOrigin({}),undefined);
});
test("deployment startup fails clearly without a Railway database reference", () => {
  assert.throws(() => validateDatabase({}),/DATABASE_URL is missing/);
  assert.throws(() => validateDatabase({ DATABASE_URL: "https://example.com" }),/PostgreSQL/);
  assert.throws(() => validateDatabase({ DATABASE_URL: "postgresql://user:unused@localhost:5432/db", RAILWAY_PROJECT_ID: "test" }),/local development/);
  assert.doesNotThrow(() => validateDatabase({ DATABASE_URL: "postgresql://user:unused@postgres.railway.internal:5432/railway", RAILWAY_PROJECT_ID: "test" }));
});
