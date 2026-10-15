import { db, transaction } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { createInstitution } from "../src/lib/organization";
import { createTask, actOnTask } from "../src/lib/tasks";
import type { Role, User } from "@prisma/client";
export async function seedDemo(password: string) {
  if (password.length < 12) throw new Error("Use a demo password of at least 12 characters.");
  const existing = await db.user.findUnique({ where: { email: "ceo@demo.sah.local" }, include: { institution: true } });
  if (existing?.institution.demo) return { skipped: true };
  if (await db.user.count()) throw new Error("Demo seeding requires an empty database; existing data will not be overwritten.");
  const hash = await hashPassword(password);
  const users = await transaction(async tx => {
    const institution = await createInstitution(tx, "SAH Demonstration Institution", true);
    const campus = await tx.campus.findFirstOrThrow({ where: { institutionId: institution.id } });
    await tx.campus.create({ data: { institutionId: institution.id, name: "City Campus · Demo" } });
    const departments = await tx.department.findMany({ where: { institutionId: institution.id } });
    const users: Record<string, User> = {};
    async function user(key: string, name: string, title: string, role: Role, department: string | null, manager: string | null, access = "") {
      users[key] = await tx.user.create({ data: { email: `${key}@demo.sah.local`, name, title, role, passwordHash: hash,
        institutionId: institution.id, campusId: campus.id, departmentId: departments.find(d => d.name === department)?.id,
        managerId: manager ? users[manager].id : undefined, canDelegate: !["EMPLOYEE", "SYSTEM_ADMIN"].includes(role),
        canAccessHr: access.includes("hr"), canAccessFinance: access.includes("finance") } });
    }
    await user("ceo", "Demo CEO", "Chief Executive Officer", "CEO", null, null, "hr finance");
    await user("finance", "Demo Finance Director", "Finance Director", "FINANCE_DIRECTOR", "Finance", "ceo", "finance");
    await user("operations", "Demo Operations Director", "Operations Director", "OPERATIONS_DIRECTOR", "Operations", "ceo");
    await user("accounts", "Demo Accounts Head", "Accounts Head", "DEPARTMENT_HEAD", "Accounts", "finance", "finance");
    await user("academic", "Demo Academic Head", "Principal · Academic Department Head", "DEPARTMENT_HEAD", "Academic", "operations");
    await user("hr", "Demo HR Head", "HR & Administration Head", "DEPARTMENT_HEAD", "HR & Administration", "operations", "hr");
    await user("admissions", "Demo Admissions Head", "Admissions Head", "DEPARTMENT_HEAD", "Admissions", "operations");
    await user("it", "Demo IT Head", "IT Head", "DEPARTMENT_HEAD", "IT", "operations");
    await user("maintenance", "Demo Maintenance Supervisor", "Maintenance Supervisor", "SUPERVISOR", "Maintenance", "hr");
    await user("technician", "Demo Technician", "Maintenance Technician", "EMPLOYEE", "Maintenance", "maintenance");
    await user("teacher", "Demo Teacher", "Teacher", "EMPLOYEE", "Academic", "academic");
    await user("clerk", "Demo Accounts Officer", "Accounts Officer", "EMPLOYEE", "Accounts", "accounts", "finance");
    await user("admin", "Demo System Administrator", "System Administrator", "SYSTEM_ADMIN", null, null);
    await tx.bootstrap.create({ data: { userId: users.ceo.id } });
    await tx.automationPolicy.create({ data: {} });
    await tx.auditLog.create({ data: { actorId: users.ceo.id, action: "DEMONSTRATION_DATA_CREATED", entityId: institution.id } });
    return users;
  });
  const due = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
  const root = await createTask(users.ceo, { title: "Prepare campus for inspection", instructions: "Coordinate academic, facility, and IT readiness. This is demonstration work, not a live assignment.", executorId: users.operations.id, dueAt: due(7), priority: "HIGH" });
  const facility = await createTask(users.operations, { title: "Coordinate facility readiness", instructions: "Delegate room inspections through HR & Administration and Maintenance.", executorId: users.hr.id, dueAt: due(6), parentId: root.id });
  const maintenance = await createTask(users.hr, { title: "Inspect classrooms and laboratories", instructions: "Assign repair jobs and collect verification evidence.", executorId: users.maintenance.id, dueAt: due(5), parentId: facility.id });
  const repair = await createTask(users.maintenance, { title: "Repair classroom AC", instructions: "Diagnose the AC fault and report the required parts.", executorId: users.technician.id, dueAt: due(-2), parentId: maintenance.id, priority: "HIGH", requiredEvidence: "Upload the repair report or a photo before submission." });
  const timetable = await createTask(users.operations, { title: "Prepare faculty timetable", instructions: "Prepare the timetable for academic readiness review.", executorId: users.academic.id, dueAt: due(4), parentId: root.id });
  const network = await createTask(users.operations, { title: "Verify laboratory network readiness", instructions: "Test laboratory connectivity and submit a progress summary.", executorId: users.it.id, dueAt: due(4), parentId: root.id });
  await createTask(users.ceo, { title: "Reconcile monthly accounts", instructions: "Coordinate month-end reconciliation in the Finance division.", executorId: users.finance.id, dueAt: due(3), sensitivity: "FINANCE" });
  await createTask(users.ceo, { title: "Review admissions readiness", instructions: "Prepare an admissions readiness summary. Direct CEO assignment does not change reporting lines.", executorId: users.admissions.id, dueAt: due(-1), priority: "HIGH" });
  for (const [actor, task, blocked, submit] of [[users.technician, repair, true, false], [users.academic, timetable, false, true], [users.it, network, false, true]] as const) {
    let current = await actOnTask(actor, task.id, { action: "status", status: "ACKNOWLEDGED", note: "Demonstration assignment acknowledged.", version: task.version });
    current = await actOnTask(actor, task.id, { action: "status", status: "IN_PROGRESS", note: "Demonstration work has started.", version: current.version });
    if (blocked) await actOnTask(actor, task.id, { action: "status", status: "BLOCKED", note: "Demo blocker: replacement part awaiting availability.", version: current.version });
    if (submit) await actOnTask(actor, task.id, { action: "status", status: "SUBMITTED_FOR_REVIEW", note: "Demonstration work submitted for manager review.", version: current.version });
  }
  return { skipped: false };
}
if (process.argv[1]?.endsWith("seed.ts")) {
  if (process.env.ALLOW_DEMO_SEED !== "true" || process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled. Use ALLOW_DEMO_SEED=true only for local demonstration.");
  try { console.log(await seedDemo(process.env.DEMO_PASSWORD ?? "")); }
  finally { await db.$disconnect(); }
}
