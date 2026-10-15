import type { Task, User } from "@prisma/client";
import { requireThat } from "./errors";
export const roleLabels: Record<string, string> = {
  CEO: "CEO", FINANCE_DIRECTOR: "Finance Director", OPERATIONS_DIRECTOR: "Operations Director",
  DEPARTMENT_HEAD: "Department Head", SUPERVISOR: "Supervisor", EMPLOYEE: "Employee", SYSTEM_ADMIN: "System Administrator"
};
export function reportIds(actor: User, people: User[]): Set<string> {
  const seen = new Set<string>([actor.id]);
  const pending = [actor.id];
  while (pending.length) {
    const id = pending.pop();
    for (const person of people) {
      if (person.institutionId === actor.institutionId && person.managerId === id && !seen.has(person.id)) {
        seen.add(person.id); pending.push(person.id);
      }
    }
  }
  return seen;
}
export function canAssign(actor: User, target: User, people: User[]) {
  if (!actor.active || !target.active || actor.id === target.id || target.role === "SYSTEM_ADMIN" || actor.role === "SYSTEM_ADMIN") return false;
  if (actor.role === "CEO") return true;
  if (!actor.canDelegate || target.id === actor.id || target.institutionId !== actor.institutionId || target.role === "CEO") return false;
  return reportIds(actor, people).has(target.id) || (actor.canCrossDepartment && target.role === "EMPLOYEE");
}
export function canSeeTask(actor: User, task: Task, people: User[]) {
  if (!actor.active || actor.role === "SYSTEM_ADMIN") return false;
  if ((task.status === "DRAFT" || !task.publishedAt) && actor.role !== "CEO" && task.createdById !== actor.id) return false;
  if (task.sensitivity === "HR" && !actor.canAccessHr) return false;
  if (task.sensitivity === "FINANCE" && !actor.canAccessFinance) return false;
  if (actor.role === "CEO") return true;
  if (task.institutionId !== actor.institutionId) return false;
  const scope = reportIds(actor, people);
  return [task.executorId, task.accountableOwnerId, task.originatingAssignerId, task.createdById].some(id => scope.has(id));
}
export function canManageTask(actor: User, task: Task, people: User[]) {
  if (!canSeeTask(actor, task, people)) return false;
  if (actor.role === "CEO") return true;
  if (!actor.canDelegate) return false;
  return task.createdById === actor.id || task.originatingAssignerId === actor.id ||
    (task.executorId !== actor.id && reportIds(actor, people).has(task.executorId));
}
export function assertNoReportingCycle(personId: string, managerId: string | null, people: Pick<User, "id" | "managerId">[]) {
  const seen = new Set([personId]);
  let cursor = managerId;
  while (cursor) {
    requireThat(!seen.has(cursor), 400, "Reporting relationships cannot contain a cycle.");
    seen.add(cursor);
    const manager = people.find(p => p.id === cursor);
    requireThat(manager, 400, "Reporting manager does not exist.");
    cursor = manager.managerId;
  }
}
