import type { User } from "@prisma/client";
import { db } from "./db";
import { canAssign, canManageTask, canSeeTask, reportIds } from "./permissions";
import { closedStatuses } from "./tasks";
import { startOfWeek } from "./time";
export async function workspace(actor: User) {
  const [people, allTasks, departments, institutions, campuses, policy] = await Promise.all([
    db.user.findMany(), db.task.findMany({ orderBy: [{ dueAt: "asc" }, { id: "asc" }] }), db.department.findMany(),
    db.institution.findMany(), db.campus.findMany(), db.automationPolicy.findUnique({ where: { id: "default" } })
  ]);
  const tasks = allTasks.filter(t => canSeeTask(actor, t, people) && (t.status !== "DRAFT" || t.createdById === actor.id || actor.role === "CEO"));
  const ids = tasks.map(t => t.id);
  const now = new Date();
  const week = startOfWeek(now);
  const notifications = (await db.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 100 })).filter(n => !n.taskId || ids.includes(n.taskId));
  const [history, escalations, completedThisWeek] = await Promise.all([
    db.activity.findMany({ where: { taskId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.escalation.findMany({ where: { taskId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.approval.count({ where: { taskId: { in: tasks.filter(t => t.status === "COMPLETED").map(t => t.id) }, decision: "APPROVED", createdAt: { gte: week } } })
  ]);
  const scope = reportIds(actor, people);
  let manager = actor.managerId;
  while (manager && !scope.has(manager)) {
    scope.add(manager); manager = people.find(p => p.id === manager)?.managerId ?? null;
  }
  for (const t of tasks) for (const id of [t.executorId, t.accountableOwnerId, t.createdById, t.originatingAssignerId]) scope.add(id);
  const directory = people.filter(p => actor.role === "CEO" || actor.role === "SYSTEM_ADMIN" || scope.has(p.id) || canAssign(actor, p, people)).map(p => {
    const { passwordHash: _hash, ...safe } = p;
    return safe;
  });
  const open = tasks.filter(t => !closedStatuses.includes(t.status) && t.status !== "DRAFT");
  return {
    user: directory.find(p => p.id === actor.id)!,
    people: directory,
    institutions: institutions.filter(i => actor.role === "CEO" || actor.role === "SYSTEM_ADMIN" || i.id === actor.institutionId),
    departments: departments.filter(d => actor.role === "CEO" || actor.role === "SYSTEM_ADMIN" || d.institutionId === actor.institutionId),
    campuses: campuses.filter(c => actor.role === "CEO" || actor.role === "SYSTEM_ADMIN" || c.institutionId === actor.institutionId),
    tasks: tasks.map(t => ({ ...t, canManage: canManageTask(actor, t, people), canDelegateTask: actor.canDelegate && (t.executorId === actor.id || canManageTask(actor, t, people)), canExecute: t.executorId === actor.id })),
    assignableIds: people.filter(p => p.id !== actor.id && canAssign(actor, p, people)).map(p => p.id),
    notifications, history, escalations, policy,
    metrics: { active: open.length, overdue: open.filter(t => t.dueAt < now).length, blocked: open.filter(t => t.status === "BLOCKED").length,
      review: open.filter(t => t.status === "SUBMITTED_FOR_REVIEW").length, pending: open.filter(t => t.status === "ASSIGNED").length,
      completedThisWeek },
    demo: institutions.find(i => i.id === actor.institutionId)?.demo ?? false
  };
}
export async function taskDetail(actor: User, id: string) {
  const people = await db.user.findMany();
  const task = await db.task.findUnique({ where: { id }, include: { activities: { orderBy: { createdAt: "asc" } }, attachments: true, approvals: true, extensionRequests: true } });
  if (!task || !canSeeTask(actor, task, people) || (task.status === "DRAFT" && actor.role !== "CEO" && task.createdById !== actor.id)) return null;
  const { attachments, ...rest } = task;
  return { ...rest, attachments: attachments.map(({ storageKey: _key, ...a }) => a) };
}
