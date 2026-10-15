-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CEO', 'FINANCE_DIRECTOR', 'OPERATIONS_DIRECTOR', 'DEPARTMENT_HEAD', 'SUPERVISOR', 'EMPLOYEE', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'BLOCKED', 'SUBMITTED_FOR_REVIEW', 'CHANGES_REQUESTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Sensitivity" AS ENUM ('STANDARD', 'HR', 'FINANCE');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canDelegate" BOOLEAN NOT NULL DEFAULT false,
    "canCrossDepartment" BOOLEAN NOT NULL DEFAULT false,
    "canAccessHr" BOOLEAN NOT NULL DEFAULT false,
    "canAccessFinance" BOOLEAN NOT NULL DEFAULT false,
    "institutionId" TEXT NOT NULL,
    "campusId" TEXT,
    "departmentId" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "parentId" TEXT,
    "rootId" TEXT NOT NULL,
    "originatingAssignerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "accountableOwnerId" TEXT NOT NULL,
    "executorId" TEXT NOT NULL,
    "reportingManagerId" TEXT,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "sensitivity" "Sensitivity" NOT NULL DEFAULT 'STANDARD',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "requiredEvidence" TEXT NOT NULL DEFAULT '',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineRequest" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadlineRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "message" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationPolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "startHour" INTEGER NOT NULL DEFAULT 9,
    "endHour" INTEGER NOT NULL DEFAULT 17,
    "reminderLimit" INTEGER NOT NULL DEFAULT 1,
    "escalationHours" INTEGER NOT NULL DEFAULT 24,
    "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "AutomationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bootstrap" (
    "id" TEXT NOT NULL DEFAULT 'initial-ceo',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bootstrap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campus_institutionId_name_key" ON "Campus"("institutionId", "name");

-- CreateIndex
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_institutionId_name_key" ON "Department"("institutionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_institutionId_departmentId_idx" ON "User"("institutionId", "departmentId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- CreateIndex
CREATE INDEX "Task_rootId_idx" ON "Task"("rootId");

-- CreateIndex
CREATE INDEX "Task_institutionId_status_dueAt_idx" ON "Task"("institutionId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_executorId_idx" ON "Task"("executorId");

-- CreateIndex
CREATE INDEX "Task_accountableOwnerId_idx" ON "Task"("accountableOwnerId");

-- CreateIndex
CREATE INDEX "Task_originatingAssignerId_idx" ON "Task"("originatingAssignerId");

-- CreateIndex
CREATE INDEX "Activity_taskId_createdAt_idx" ON "Activity"("taskId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_taskId_idx" ON "Attachment"("taskId");

-- CreateIndex
CREATE INDEX "Approval_taskId_idx" ON "Approval"("taskId");

-- CreateIndex
CREATE INDEX "DeadlineRequest_taskId_status_idx" ON "DeadlineRequest"("taskId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Escalation_taskId_level_day_key" ON "Escalation"("taskId", "level", "day");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_createdAt_idx" ON "AuditLog"("entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Campus" ADD CONSTRAINT "Campus_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineRequest" ADD CONSTRAINT "DeadlineRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Immutable records and graph invariants protect writes beyond the HTTP layer.
CREATE FUNCTION sah_immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'SAH history is append-only'; END;
$$;
CREATE TRIGGER activity_append_only BEFORE UPDATE OR DELETE ON "Activity" FOR EACH ROW EXECUTE FUNCTION sah_immutable_history();
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION sah_immutable_history();
CREATE TRIGGER approval_append_only BEFORE UPDATE OR DELETE ON "Approval" FOR EACH ROW EXECUTE FUNCTION sah_immutable_history();

CREATE FUNCTION sah_reporting_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE invalid boolean;
BEGIN
  IF NEW."managerId" IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM "User" m WHERE m.id = NEW."managerId" AND (m."institutionId" = NEW."institutionId" OR m.role = 'CEO')) THEN
      RAISE EXCEPTION 'Manager must be in the same institution or be the CEO';
    END IF;
    WITH RECURSIVE chain AS (
      SELECT id, "managerId", ARRAY[id] AS path FROM "User" WHERE id = NEW."managerId"
      UNION ALL
      SELECT u.id, u."managerId", c.path || u.id FROM "User" u JOIN chain c ON u.id = c."managerId" WHERE NOT u.id = ANY(c.path)
    ) SELECT EXISTS(SELECT 1 FROM chain WHERE id = NEW.id) INTO invalid;
    IF invalid THEN RAISE EXCEPTION 'Circular reporting relationship'; END IF;
  END IF;
  IF NEW."departmentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Department" d WHERE d.id = NEW."departmentId" AND d."institutionId" = NEW."institutionId") THEN RAISE EXCEPTION 'Department institution mismatch'; END IF;
  IF NEW."campusId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Campus" c WHERE c.id = NEW."campusId" AND c."institutionId" = NEW."institutionId") THEN RAISE EXCEPTION 'Campus institution mismatch'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_reporting_guard BEFORE INSERT OR UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION sah_reporting_guard();

CREATE FUNCTION sah_department_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE invalid boolean;
BEGIN
  IF NEW."parentId" IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM "Department" p WHERE p.id = NEW."parentId" AND p."institutionId" = NEW."institutionId") THEN RAISE EXCEPTION 'Department parent institution mismatch'; END IF;
    WITH RECURSIVE chain AS (
      SELECT id, "parentId", ARRAY[id] AS path FROM "Department" WHERE id = NEW."parentId"
      UNION ALL SELECT d.id,d."parentId",c.path || d.id FROM "Department" d JOIN chain c ON d.id=c."parentId" WHERE NOT d.id=ANY(c.path)
    ) SELECT EXISTS(SELECT 1 FROM chain WHERE id=NEW.id) INTO invalid;
    IF invalid THEN RAISE EXCEPTION 'Circular department hierarchy'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER department_tree_guard BEFORE INSERT OR UPDATE ON "Department" FOR EACH ROW EXECUTE FUNCTION sah_department_guard();

CREATE FUNCTION sah_task_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_task "Task"%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND (NEW."parentId" IS DISTINCT FROM OLD."parentId" OR NEW."rootId" <> OLD."rootId" OR NEW."accountableOwnerId" <> OLD."accountableOwnerId" OR NEW."originatingAssignerId" <> OLD."originatingAssignerId" OR NEW."institutionId" <> OLD."institutionId") THEN
    RAISE EXCEPTION 'Task lineage and original accountability are immutable';
  END IF;
  IF NEW."parentId" IS NULL THEN
    IF NEW."rootId" <> NEW.id THEN RAISE EXCEPTION 'Root task must reference itself'; END IF;
  ELSE
    IF NEW."parentId"=NEW.id THEN RAISE EXCEPTION 'Circular task hierarchy'; END IF;
    SELECT * INTO parent_task FROM "Task" WHERE id=NEW."parentId";
    IF NOT FOUND OR NEW."rootId" <> parent_task."rootId" OR NEW."institutionId" <> parent_task."institutionId" OR NEW."dueAt" > parent_task."dueAt" THEN RAISE EXCEPTION 'Invalid task lineage or subtask deadline'; END IF;
    IF NEW."accountableOwnerId"<>parent_task."accountableOwnerId" OR NEW."originatingAssignerId"<>parent_task."originatingAssignerId" THEN RAISE EXCEPTION 'Delegation must retain original accountability'; END IF;
    IF NEW.sensitivity<>parent_task.sensitivity THEN RAISE EXCEPTION 'Delegation must retain sensitivity'; END IF;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM "User" u WHERE u.id=NEW."executorId" AND u."institutionId"=NEW."institutionId") THEN RAISE EXCEPTION 'Executor institution mismatch'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER task_lineage_guard BEFORE INSERT OR UPDATE ON "Task" FOR EACH ROW EXECUTE FUNCTION sah_task_guard();
ALTER TABLE "Task" ADD CONSTRAINT task_origin_fk FOREIGN KEY ("originatingAssignerId") REFERENCES "User"(id);
ALTER TABLE "Task" ADD CONSTRAINT task_creator_fk FOREIGN KEY ("createdById") REFERENCES "User"(id);
ALTER TABLE "Task" ADD CONSTRAINT task_owner_fk FOREIGN KEY ("accountableOwnerId") REFERENCES "User"(id);
ALTER TABLE "Task" ADD CONSTRAINT task_executor_fk FOREIGN KEY ("executorId") REFERENCES "User"(id);
CREATE INDEX task_created_by_idx ON "Task"("createdById");
