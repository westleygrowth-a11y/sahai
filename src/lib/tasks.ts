import { Priority, Sensitivity, TaskStatus, type Task, type User } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { transaction, type Tx } from "./db";
import { requireThat } from "./errors";
import { canAssign, canManageTask, canSeeTask } from "./permissions";
export const statusLabels: Record<TaskStatus, string> = {
  DRAFT: "Draft", ASSIGNED: "Assigned", ACKNOWLEDGED: "Acknowledged", IN_PROGRESS: "In Progress", BLOCKED: "Blocked",
  SUBMITTED_FOR_REVIEW: "Submitted for Review", CHANGES_REQUESTED: "Changes Requested", COMPLETED: "Completed", CANCELLED: "Cancelled"
};
export const closedStatuses: TaskStatus[] = ["COMPLETED", "CANCELLED"];
const createSchema = z.object({ title: z.string().trim().min(3).max(180), instructions: z.string().trim().min(3).max(10000),
  executorId: z.uuid(), parentId: z.uuid().optional(), dueAt: z.iso.datetime({ offset: true }), priority: z.enum(Priority).default("NORMAL"),
  requiredEvidence: z.string().max(2000).default(""), approvalRequired: z.literal(true).default(true), mandatory: z.boolean().default(true),
  sensitivity: z.enum(Sensitivity).default("STANDARD"), draft: z.boolean().default(false) });
export async function notify(tx: Tx, userId: string, taskId: string, message: string, simulated = false, dedupeKey?: string) {
  if (dedupeKey) return tx.notification.upsert({ where: { dedupeKey }, create: { userId, taskId, message, simulated, dedupeKey }, update: {} });
  return tx.notification.create({ data: { userId, taskId, message, simulated } });
}
export async function activity(tx: Tx, taskId: string, actorId: string, type: string, message: string, data: object = {}) {
  await tx.activity.create({ data: { taskId, actorId, type, message, data } });
  await tx.auditLog.create({ data: { actorId, action: type, entityId: taskId, data } });
}
export async function createTask(actor: User, input: unknown) {
  const data = createSchema.parse(input);
  return transaction(async tx => {
    const people = await tx.user.findMany();
    const liveActor = people.find(p => p.id === actor.id && p.active);
    requireThat(liveActor, 401, "Your account is no longer active.");
    actor = liveActor;
    const executor = people.find(p => p.id === data.executorId);
    requireThat(executor && canAssign(actor, executor, people) && executor.id !== actor.id, 403, "You cannot assign work to this employee.");
    const parent = data.parentId ? await tx.task.findUnique({ where: { id: data.parentId } }) : null;
    requireThat(!data.parentId || (parent && canSeeTask(actor, parent, people)), 404, "Parent task not found.");
    if (parent) {
      requireThat(!data.draft, 400, "Delegated subtasks are assigned immediately; draft mode is available for root tasks.");
      requireThat(actor.canDelegate && (parent.executorId === actor.id || canManageTask(actor, parent, people)), 403, "You cannot delegate this assignment.");
      requireThat(!closedStatuses.includes(parent.status) && parent.status !== "SUBMITTED_FOR_REVIEW" && parent.status !== "DRAFT", 409, "This task cannot accept new delegation in its current state.");
      requireThat(executor.institutionId === parent.institutionId, 400, "A subtask must stay within its parent's institution.");
      requireThat(new Date(data.dueAt) <= parent.dueAt, 400, "A subtask deadline cannot exceed the parent deadline. Request and approve a parent extension first.");
      requireThat(data.sensitivity === parent.sensitivity, 400, "A subtask must preserve its parent's sensitive classification.");
    }
    const sensitivity = data.sensitivity;
    requireThat((sensitivity !== "HR" || (actor.canAccessHr && executor.canAccessHr)) &&
      (sensitivity !== "FINANCE" || (actor.canAccessFinance && executor.canAccessFinance)), 403, "Both assigner and executor need access to this sensitive classification.");
    const id = randomUUID();
    const task = await tx.task.create({ data: { id, title: data.title, instructions: data.instructions,
      parentId: parent?.id, rootId: parent?.rootId ?? id, originatingAssignerId: parent?.originatingAssignerId ?? actor.id,
      createdById: actor.id, accountableOwnerId: parent?.accountableOwnerId ?? executor.id,
      executorId: executor.id, reportingManagerId: executor.managerId, institutionId: executor.institutionId,
      departmentId: executor.departmentId, priority: data.priority, dueAt: new Date(data.dueAt), requiredEvidence: data.requiredEvidence,
      approvalRequired: data.approvalRequired, mandatory: data.mandatory, sensitivity, status: data.draft ? "DRAFT" : "ASSIGNED", publishedAt: data.draft ? null : new Date() } });
    await activity(tx, id, actor.id, parent ? "TASK_DELEGATED" : "TASK_CREATED", parent ? "Delegated a subtask; original accountability retained." : "Created assignment.",
      { parentId: parent?.id ?? null, accountableOwnerId: task.accountableOwnerId, executorId: executor.id });
    if (!data.draft) await notify(tx, executor.id, id, `New assignment: ${task.title}`);
    if (parent) await activity(tx, parent.id, actor.id, "SUBTASK_CREATED", `Delegated: ${task.title}`, { childId: id });
    return task;
  });
}
const transitionMap: Partial<Record<TaskStatus, TaskStatus[]>> = {
  ASSIGNED: ["ACKNOWLEDGED"], ACKNOWLEDGED: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["BLOCKED", "SUBMITTED_FOR_REVIEW"], BLOCKED: ["IN_PROGRESS"], CHANGES_REQUESTED: ["IN_PROGRESS", "BLOCKED", "SUBMITTED_FOR_REVIEW"]
};
export const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(TaskStatus), note: z.string().trim().min(3).max(5000), version: z.int().nonnegative() }),
  z.object({ action: z.literal("comment"), note: z.string().trim().min(1).max(5000), version: z.int().nonnegative() }),
  z.object({ action: z.literal("review"), decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]), note: z.string().trim().min(3).max(5000), version: z.int().nonnegative() }),
  z.object({ action: z.literal("reassign"), executorId: z.uuid(), note: z.string().trim().min(3).max(2000), version: z.int().nonnegative() }),
  z.object({ action: z.literal("extension"), dueAt: z.iso.datetime({ offset: true }), note: z.string().trim().min(3).max(2000), version: z.int().nonnegative() }),
  z.object({ action: z.literal("extension-review"), requestId: z.uuid(), approve: z.boolean(), note: z.string().trim().min(3).max(2000), version: z.int().nonnegative() }),
  z.object({ action: z.literal("request-update"), note: z.string().trim().min(3).max(2000), version: z.int().nonnegative() })
]);
export async function actOnTask(actor: User, id: string, input: unknown) {
  const data = actionSchema.parse(input);
  return transaction(async tx => {
    const people = await tx.user.findMany();
    const liveActor = people.find(p => p.id === actor.id && p.active);
    requireThat(liveActor, 401, "Your account is no longer active.");
    actor = liveActor;
    const task = await tx.task.findUnique({ where: { id } });
    requireThat(task && canSeeTask(actor, task, people), 404, "Task not found.");
    requireThat(task.version === data.version, 409, "This task changed. Refresh before trying again.");
    const manages = canManageTask(actor, task, people);
    const executes = actor.id === task.executorId;
    const open = !closedStatuses.includes(task.status);
    if (data.action === "comment") {
      await activity(tx, id, actor.id, "COMMENT", data.note);
    } else if (data.action === "status") {
      const publish = task.status === "DRAFT" && data.status === "ASSIGNED" && manages;
      const cancel = data.status === "CANCELLED" && manages && open;
      requireThat(publish || cancel || (executes && (transitionMap[task.status] ?? []).includes(data.status)), 403, "This status transition is not permitted.");
      if (cancel) requireThat(await tx.task.count({ where: { parentId: id, status: { notIn: closedStatuses } } }) === 0, 409, "Resolve or cancel open subtasks before cancelling their parent.");
      if (data.status === "SUBMITTED_FOR_REVIEW") await assertReadyToSubmit(tx, task);
      await tx.task.update({ where: { id }, data: { status: data.status, ...(publish ? { publishedAt: new Date() } : {}) } });
      await activity(tx, id, actor.id, "STATUS_CHANGED", data.note, { from: task.status, to: data.status });
      if (publish) await notify(tx, task.executorId, id, `New assignment: ${task.title}`);
      if (data.status === "SUBMITTED_FOR_REVIEW" || data.status === "BLOCKED") {
        await notify(tx, task.createdById, id, `${statusLabels[data.status]}: ${task.title}`);
        if (task.originatingAssignerId !== task.createdById) await notify(tx, task.originatingAssignerId, id, `${statusLabels[data.status]}: ${task.title}`);
      }
    } else if (data.action === "review") {
      requireThat(manages && !executes && task.status === "SUBMITTED_FOR_REVIEW", 403, "An authorized manager must review submitted work; self-approval is not allowed.");
      if (data.decision === "APPROVED") await assertReadyToSubmit(tx, task);
      const status = data.decision === "APPROVED" ? "COMPLETED" : "CHANGES_REQUESTED";
      await tx.task.update({ where: { id }, data: { status } });
      await tx.approval.create({ data: { taskId: id, reviewerId: actor.id, decision: data.decision, note: data.note } });
      await activity(tx, id, actor.id, "REVIEW_DECISION", data.note, { from: task.status, to: status });
      await notify(tx, task.executorId, id, `${statusLabels[status]}: ${task.title}`);
    } else if (data.action === "reassign") {
      requireThat(manages && open && task.status !== "SUBMITTED_FOR_REVIEW", 403, "You cannot reassign this task in its current state.");
      const executor = people.find(p => p.id === data.executorId);
      requireThat(executor && executor.institutionId === task.institutionId && canAssign(actor, executor, people), 403, "Reassignment is outside your authority.");
      requireThat((task.sensitivity !== "HR" || executor.canAccessHr) && (task.sensitivity !== "FINANCE" || executor.canAccessFinance), 403, "Executor lacks sensitive-record access.");
      await tx.task.update({ where: { id }, data: { executorId: executor.id, reportingManagerId: executor.managerId, departmentId: executor.departmentId, status: task.status === "DRAFT" ? "DRAFT" : "ASSIGNED" } });
      await activity(tx, id, actor.id, "TASK_REASSIGNED", data.note, { previousExecutorId: task.executorId, executorId: executor.id, accountableOwnerId: task.accountableOwnerId });
      if (task.status !== "DRAFT") await notify(tx, executor.id, id, `Reassigned to you: ${task.title}`);
    } else if (data.action === "extension") {
      requireThat(open && (executes || manages), 403, "You cannot request an extension for this task.");
      requireThat(new Date(data.dueAt) > task.dueAt, 400, "An extension must move the deadline later.");
      await tx.deadlineRequest.create({ data: { taskId: id, requesterId: actor.id, requestedAt: new Date(data.dueAt), reason: data.note } });
      await activity(tx, id, actor.id, "EXTENSION_REQUESTED", data.note, { requestedAt: data.dueAt });
      await notify(tx, task.createdById, id, `Deadline extension requested: ${task.title}`);
    } else if (data.action === "extension-review") {
      requireThat(manages && !executes && open, 403, "Only an authorized reviewing manager can decide this extension.");
      const request = await tx.deadlineRequest.findUnique({ where: { id: data.requestId } });
      requireThat(request && request.taskId === id && request.status === "PENDING" && request.requesterId !== actor.id, 400, "No eligible pending extension found.");
      if (data.approve) {
        requireThat(request.requestedAt > task.dueAt, 409, "This extension is no longer later than the current deadline.");
        if (task.parentId) {
          const parent = await tx.task.findUniqueOrThrow({ where: { id: task.parentId } });
          requireThat(request.requestedAt <= parent.dueAt, 400, "Approve a parent deadline extension first.");
        }
        await tx.task.update({ where: { id }, data: { dueAt: request.requestedAt } });
      }
      await tx.deadlineRequest.update({ where: { id: request.id }, data: { status: data.approve ? "APPROVED" : "REJECTED", reviewerId: actor.id } });
      await activity(tx, id, actor.id, "EXTENSION_REVIEWED", data.note, { approved: data.approve, requestId: request.id });
      await notify(tx, request.requesterId, id, `Extension ${data.approve ? "approved" : "rejected"}: ${task.title}`);
    } else if (data.action === "request-update") {
      requireThat(manages && open, 403, "Only an authorized manager can request an update.");
      await notify(tx, task.executorId, id, `Update requested: ${task.title} — ${data.note}`);
      await activity(tx, id, actor.id, "UPDATE_REQUESTED", data.note);
    }
    return tx.task.update({ where: { id }, data: { version: { increment: 1 } } });
  });
}
async function assertReadyToSubmit(tx: Tx, task: Task) {
  requireThat(await tx.task.count({ where: { parentId: task.id, mandatory: true, status: { not: "COMPLETED" } } }) === 0, 409, "Complete all mandatory subtasks before submitting or approving the parent.");
  if (task.requiredEvidence.trim()) requireThat(await tx.attachment.count({ where: { taskId: task.id } }) > 0, 400, "Upload the required evidence before submission.");
}
