import { Role, type User } from "@prisma/client";
import { z } from "zod";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { db, transaction, type Tx } from "./db";
import { digest, hashPassword } from "./auth";
import { requireThat } from "./errors";
import { assertNoReportingCycle } from "./permissions";
export const userPublic = { id: true, email: true, name: true, title: true, role: true, active: true,
  canDelegate: true, canCrossDepartment: true, canAccessHr: true, canAccessFinance: true,
  institutionId: true, departmentId: true, campusId: true, managerId: true } as const;
export const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(128);
export const setupSchema = z.object({ token: z.string().min(1).max(256), email: z.email().max(254).transform(v => v.toLowerCase()),
  password: passwordSchema, name: z.string().trim().min(2).max(100), institution: z.string().trim().min(2).max(150) });
export async function setupCeo(input: unknown) {
  const data = setupSchema.parse(input);
  const expected = process.env.SETUP_TOKEN;
  requireThat(expected && expected.length >= 32 && !expected.includes("GENERATE_"), 503, "Configure a private SETUP_TOKEN before initial setup.");
  requireThat(timingSafeEqual(Buffer.from(digest(data.token)), Buffer.from(digest(expected))), 403, "Invalid setup token.");
  const passwordHash = await hashPassword(data.password);
  return transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(8734101)`;
    requireThat(!await tx.bootstrap.findUnique({ where: { id: "initial-ceo" } }), 409, "Initial CEO setup is already complete.");
    requireThat(!await tx.user.findFirst({ where: { role: "CEO" } }), 409, "A CEO account already exists.");
    const org = await createInstitution(tx, data.institution);
    const user = await tx.user.create({ data: { email: data.email, name: data.name, title: "Chief Executive Officer", passwordHash,
      role: "CEO", canDelegate: true, canAccessHr: true, canAccessFinance: true, institutionId: org.id } });
    await tx.bootstrap.create({ data: { userId: user.id } });
    await tx.automationPolicy.upsert({ where: { id: "default" }, create: {}, update: {} });
    await tx.auditLog.create({ data: { actorId: user.id, action: "INITIAL_CEO_SETUP", entityId: user.id } });
    return user;
  });
}
export async function createInstitution(tx: Tx, name: string, demo = false) {
  const institution = await tx.institution.create({ data: { name, demo } });
  await tx.campus.create({ data: { name: "Main Campus", institutionId: institution.id } });
  const finance = await tx.department.create({ data: { name: "Finance", institutionId: institution.id } });
  const operations = await tx.department.create({ data: { name: "Operations", institutionId: institution.id } });
  for (const name of ["Accounts", "Academic", "HR & Administration", "Admissions", "IT"]) {
    const dept = await tx.department.create({ data: { name, institutionId: institution.id, parentId: name === "Accounts" ? finance.id : operations.id } });
    if (name === "HR & Administration") await tx.department.create({ data: { name: "Maintenance", institutionId: institution.id, parentId: dept.id } });
  }
  return institution;
}
const employeeSchema = z.object({ id: z.uuid().optional(), name: z.string().trim().min(2).max(100),
  email: z.email().max(254).transform(v => v.toLowerCase()), title: z.string().trim().min(2).max(100),
  password: passwordSchema.optional(), role: z.enum(Role), institutionId: z.uuid(), departmentId: z.uuid().nullable(),
  campusId: z.uuid().nullable(), managerId: z.uuid().nullable(), canDelegate: z.boolean(),
  canCrossDepartment: z.boolean().default(false), canAccessHr: z.boolean().default(false), canAccessFinance: z.boolean().default(false), active: z.boolean().default(true) });
export async function saveEmployee(actor: User, input: unknown) {
  requireThat(actor.role === "CEO", 403, "Only the CEO can change reporting lines and management permissions.");
  const data = employeeSchema.parse(input);
  const hash = data.password ? await hashPassword(data.password) : undefined;
  return transaction(async tx => {
    const people = await tx.user.findMany();
    const existing = data.id ? people.find(p => p.id === data.id) : undefined;
    requireThat(!data.id || existing, 404, "Employee not found.");
    requireThat(data.role !== "CEO" || existing?.role === "CEO", 400, "The initial CEO role cannot be duplicated here.");
    requireThat(!existing || existing.role !== "CEO" || (data.role === "CEO" && data.active && !data.managerId), 400, "The CEO must remain active at the top of the hierarchy.");
    requireThat(data.role !== "CEO" || (data.canDelegate && data.canAccessHr && data.canAccessFinance), 400, "The CEO retains full oversight and delegation authority.");
    requireThat(!existing || existing.institutionId === data.institutionId, 400, "Moving employees between institutions requires a separate migration workflow.");
    requireThat(existing || hash, 400, "A new employee requires a password.");
    const id = existing?.id ?? randomUUID();
    assertNoReportingCycle(id, data.managerId, people);
    const manager = people.find(p => p.id === data.managerId);
    requireThat(!data.managerId || (manager?.active && manager.role !== "SYSTEM_ADMIN" && (manager.role !== "EMPLOYEE" || manager.canDelegate) &&
      (manager.institutionId === data.institutionId || manager.role === "CEO")), 400, "Choose an active manager in the same institution (or the CEO).");
    requireThat(!["FINANCE_DIRECTOR", "OPERATIONS_DIRECTOR"].includes(data.role) || manager?.role === "CEO", 400, "Directors report to the CEO.");
    const departments = await tx.department.findMany({ where: { institutionId: data.institutionId } });
    requireThat(!data.departmentId || departments.some(d => d.id === data.departmentId), 400, "Department does not belong to this institution.");
    if (data.campusId) requireThat(await tx.campus.findFirst({ where: { id: data.campusId, institutionId: data.institutionId } }), 400, "Campus does not belong to this institution.");
    requireThat(await tx.institution.findUnique({ where: { id: data.institutionId } }), 400, "Institution not found.");
    if (data.role === "SYSTEM_ADMIN") requireThat(!data.canDelegate && !data.canAccessFinance && !data.canAccessHr && !data.canCrossDepartment, 400, "System administration does not confer management authority.");
    const { password: _password, id: _id, ...values } = data;
    const user = existing ? await tx.user.update({ where: { id }, data: { ...values, ...(hash ? { passwordHash: hash } : {}) } }) :
      await tx.user.create({ data: { id, ...values, passwordHash: hash! } });
    if (existing) await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: existing ? "EMPLOYEE_UPDATED" : "EMPLOYEE_CREATED", entityId: id,
      data: { role: data.role, managerId: data.managerId, departmentId: data.departmentId } } });
    return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: userPublic });
  });
}
const departmentSchema = z.object({ id: z.uuid().optional(), name: z.string().trim().min(2).max(100), institutionId: z.uuid(), parentId: z.uuid().nullable() });
export async function saveDepartment(actor: User, input: unknown) {
  requireThat(actor.role === "CEO" || actor.role === "SYSTEM_ADMIN", 403, "Organization administration is required.");
  const data = departmentSchema.parse(input);
  return transaction(async tx => {
    const departments = await tx.department.findMany({ where: { institutionId: data.institutionId } });
    const existing = data.id ? departments.find(d => d.id === data.id) : undefined;
    requireThat(!data.id || existing, 404, "Department not found in this institution.");
    requireThat(!data.parentId || departments.some(d => d.id === data.parentId), 400, "Parent department must belong to the same institution.");
    const id = existing?.id ?? randomUUID();
    assertNoReportingCycle(id, data.parentId, departments.map(d => ({ id: d.id, managerId: d.parentId })));
    const result = existing ? await tx.department.update({ where: { id }, data: { name: data.name, parentId: data.parentId } }) : await tx.department.create({ data: { ...data, id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "DEPARTMENT_SAVED", entityId: result.id } });
    return result;
  });
}
export async function addLocation(actor: User, input: unknown) {
  requireThat(actor.role === "CEO" || actor.role === "SYSTEM_ADMIN", 403, "Organization administration is required.");
  const data = z.object({ name: z.string().trim().min(2).max(150), institutionId: z.uuid().optional() }).parse(input);
  return transaction(async tx => {
    const result = data.institutionId ? await tx.campus.create({ data: { name: data.name, institutionId: data.institutionId } }) : await createInstitution(tx, data.name);
    await tx.auditLog.create({ data: { actorId: actor.id, action: data.institutionId ? "CAMPUS_CREATED" : "INSTITUTION_CREATED", entityId: result.id } });
    return result;
  });
}
