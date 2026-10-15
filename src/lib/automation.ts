import type { AutomationPolicy, User } from "@prisma/client";
import { z } from "zod";
import { db, transaction } from "./db";
import { localParts } from "./time";
import { notify, activity, closedStatuses } from "./tasks";
import { canSeeTask } from "./permissions";
import { requireThat } from "./errors";
export function withinWorkingHours(now: Date, policy: AutomationPolicy) {
  const local = localParts(now, policy.timezone);
  return policy.workingDays.includes(local.weekday) && !policy.holidays.includes(local.day) && local.hour >= policy.startHour && local.hour < policy.endHour;
}
export async function runFollowUps(actor?: User, now = new Date()) {
  requireThat(!actor || actor.role === "CEO", 403, "Only the CEO can run organization-wide follow-up simulation.");
  return transaction(async tx => {
    const policy = await tx.automationPolicy.upsert({ where: { id: "default" }, create: {}, update: {} });
    if (!withinWorkingHours(now, policy)) return { simulated: true, skipped: "Outside configured working hours or on a holiday.", reminders: 0, escalations: 0 };
    const people = await tx.user.findMany();
    const tasks = await tx.task.findMany({ where: { status: { notIn: [...closedStatuses, "DRAFT", "SUBMITTED_FOR_REVIEW"] }, dueAt: { lte: new Date(now.getTime() + 24 * 3600000) } } });
    let reminders = 0, escalations = 0;
    const day = localParts(now, policy.timezone).day;
    for (const task of tasks) {
      const executor = people.find(p => p.id === task.executorId);
      if (!executor?.active) continue;
      const key = `reminder:${task.id}:${day}`;
      const sent = await tx.notification.count({ where: { taskId: task.id, userId: executor.id, simulated: true, dedupeKey: { startsWith: `reminder:${task.id}:${day}` } } });
      if (sent < policy.reminderLimit && !await tx.notification.findUnique({ where: { dedupeKey: key } })) {
        await notify(tx, executor.id, task.id, `[Simulation] ${task.dueAt < now ? "Overdue —" : "Due soon —"} please update: ${task.title}`, true, key);
        await activity(tx, task.id, "rules-engine", "SIMULATED_REMINDER", "Rules-based in-app reminder queued; no external message sent.");
        reminders++;
      }
      const overdueHours = (now.getTime() - task.dueAt.getTime()) / 3600000;
      const levelsDue = Math.floor(overdueHours / policy.escalationHours);
      let cursor = executor.managerId;
      let level = 1;
      const visited = new Set([executor.id]);
      while (cursor && level <= levelsDue && !visited.has(cursor)) {
        visited.add(cursor);
        const manager = people.find(p => p.id === cursor);
        if (!manager) break;
        if (manager.active && canSeeTask(manager, task, people) && !await tx.escalation.findUnique({ where: { taskId_level_day: { taskId: task.id, level, day } } })) {
          await tx.escalation.create({ data: { taskId: task.id, toUserId: manager.id, level, day } });
          await notify(tx, manager.id, task.id, `[Simulation] Escalation: ${task.title} is overdue.`, true, `escalation:${task.id}:${level}:${day}`);
          await activity(tx, task.id, "rules-engine", "SIMULATED_ESCALATION", "Escalated through the formal reporting hierarchy.", { level, toUserId: manager.id });
          escalations++;
        }
        cursor = manager.managerId; level++;
      }
    }
    return { simulated: true, reminders, escalations };
  });
}
export const policySchema = z.object({ timezone: z.literal("Asia/Karachi"), workingDays: z.array(z.int().min(0).max(6)).min(1).max(7),
  startHour: z.int().min(0).max(23), endHour: z.int().min(1).max(24), reminderLimit: z.int().min(0).max(1), escalationHours: z.int().min(1).max(720), holidays: z.array(z.iso.date()).max(366) }).refine(d => d.endHour > d.startHour, "Working hours must end after they start.");
export async function savePolicy(actor: User, input: unknown) {
  requireThat(actor.role === "CEO", 403, "Only the CEO can change follow-up policy.");
  const data = policySchema.parse(input);
  return transaction(async tx => {
    await tx.auditLog.create({ data: { actorId: actor.id, action: "AUTOMATION_POLICY_UPDATED", entityId: "default", data } });
    return tx.automationPolicy.upsert({ where: { id: "default" }, create: data, update: data });
  });
}
export async function briefing(actor: User) {
  const people = await db.user.findMany();
  const tasks = (await db.task.findMany()).filter(t => canSeeTask(actor, t, people) && t.status !== "DRAFT" && !closedStatuses.includes(t.status));
  const overdue = tasks.filter(t => t.dueAt < new Date()).length;
  const blocked = tasks.filter(t => t.status === "BLOCKED").length;
  return { mode: "simulation", label: "Rules-based summary · not AI-generated", text: `${tasks.length} open assignments in your scope. ${overdue} overdue; ${blocked} blocked. Review the attention queue and request updates where needed. No employee progress has been inferred.` };
}
