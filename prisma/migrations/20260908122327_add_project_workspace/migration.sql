-- AlterTable
ALTER TABLE "Project" ADD COLUMN "budget" TEXT;
ALTER TABLE "Project" ADD COLUMN "businessGoals" TEXT;
ALTER TABLE "Project" ADD COLUMN "clientWishes" TEXT;
ALTER TABLE "Project" ADD COLUMN "constraints" TEXT;
ALTER TABLE "Project" ADD COLUMN "directLogin" TEXT;
ALTER TABLE "Project" ADD COLUMN "history" TEXT;
ALTER TABLE "Project" ADD COLUMN "priorities" TEXT;
ALTER TABLE "Project" ADD COLUMN "problems" TEXT;
ALTER TABLE "Project" ADD COLUMN "qualifiedLeadParams" TEXT;
ALTER TABLE "Project" ADD COLUMN "questions" TEXT;
ALTER TABLE "Project" ADD COLUMN "regions" TEXT;
ALTER TABLE "Project" ADD COLUMN "site" TEXT;
ALTER TABLE "Project" ADD COLUMN "topic" TEXT;

-- CreateTable
CREATE TABLE "ProjectLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "validDatesNote" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectGoal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
