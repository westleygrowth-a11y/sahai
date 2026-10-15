import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { User } from "@prisma/client";
import { transaction } from "./db";
import { canSeeTask, canManageTask } from "./permissions";
import { activity, closedStatuses } from "./tasks";
import { requireThat } from "./errors";
export const evidenceDir = () => join(process.cwd(), ".local", "evidence");
export async function uploadEvidence(actor: User, taskId: string, file: File) {
  requireThat(file.size > 0 && file.size <= 2 * 1024 * 1024, 400, "Evidence must be between 1 byte and 2 MB.");
  requireThat(["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(file.type), 400, "Use a PDF, PNG, JPEG, or plain-text file.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const valid = file.type === "application/pdf" ? buffer.subarray(0, 5).toString() === "%PDF-" : file.type === "image/png" ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
    file.type === "image/jpeg" ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 : !buffer.includes(0);
  requireThat(valid, 400, "File contents do not match the selected file type.");
  const storageKey = randomUUID();
  await mkdir(evidenceDir(), { recursive: true, mode: 0o700 });
  const path = join(evidenceDir(), storageKey);
  await writeFile(path, buffer, { mode: 0o600, flag: "wx" });
  try {
    return await transaction(async tx => {
      const people = await tx.user.findMany();
      const task = await tx.task.findUnique({ where: { id: taskId } });
      requireThat(task && canSeeTask(actor, task, people), 404, "Task not found.");
      requireThat(!closedStatuses.includes(task.status) && task.status !== "SUBMITTED_FOR_REVIEW" && (task.executorId === actor.id || canManageTask(actor, task, people)), 403, "Evidence cannot be added to this task in its current state.");
      const name = file.name.replace(/[\x00-\x1f/\\]/g, "_").slice(0, 150) || "evidence";
      const saved = await tx.attachment.create({ data: { taskId, uploadedById: actor.id, name, mediaType: file.type, size: file.size, storageKey } });
      await activity(tx, taskId, actor.id, "EVIDENCE_UPLOADED", `Uploaded evidence: ${name}`, { attachmentId: saved.id });
      await tx.task.update({ where: { id: taskId }, data: { version: { increment: 1 } } });
      const { storageKey: _key, ...publicAttachment } = saved;
      return publicAttachment;
    });
  } catch (error) { await unlink(path); throw error; }
}
