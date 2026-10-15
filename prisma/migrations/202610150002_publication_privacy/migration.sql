ALTER TABLE "Task" ADD COLUMN "publishedAt" TIMESTAMP(3);
UPDATE "Task" SET "publishedAt" = "createdAt" WHERE status <> 'DRAFT';
