-- CreateEnum
CREATE TYPE "SemesterBreakKind" AS ENUM ('BREAK', 'EXAM');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "milestone_id" UUID;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "semester_name" TEXT,
ADD COLUMN     "semester_start" DATE,
ADD COLUMN     "semester_weeks" INTEGER;

-- CreateTable
CREATE TABLE "semester_breaks" (
    "workspace_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "kind" "SemesterBreakKind" NOT NULL,
    "label" TEXT,

    CONSTRAINT "semester_breaks_pkey" PRIMARY KEY ("workspace_id","week_start")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestones_project_id_due_date_idx" ON "milestones"("project_id", "due_date");

-- CreateIndex
CREATE INDEX "tasks_milestone_id_idx" ON "tasks"("milestone_id");

-- AddForeignKey
ALTER TABLE "semester_breaks" ADD CONSTRAINT "semester_breaks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
