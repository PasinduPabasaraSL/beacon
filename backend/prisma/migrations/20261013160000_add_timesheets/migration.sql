-- Weekly timesheets: entries become rows with hours per day, and review moves to the whole week.

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "timesheets" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_days" (
    "entry_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_days_pkey" PRIMARY KEY ("entry_id","date")
);

-- Backfill: one timesheet per member and week. Existing entries were already sent for review,
-- so a week is approved when every entry was, needs changes when any did, and is submitted otherwise.
INSERT INTO "timesheets" (
    "id", "project_id", "user_id", "week_start", "status", "submitted_at",
    "reviewed_by_id", "reviewed_at", "review_comment", "created_at", "updated_at"
)
SELECT
    gen_random_uuid(),
    "project_id",
    "user_id",
    "week_start",
    CASE
        WHEN bool_or("review_status" = 'CHANGES_REQUESTED') THEN 'CHANGES_REQUESTED'::"TimesheetStatus"
        WHEN bool_and("review_status" = 'APPROVED') THEN 'APPROVED'::"TimesheetStatus"
        ELSE 'SUBMITTED'::"TimesheetStatus"
    END,
    min("created_at"),
    (array_agg("reviewed_by_id" ORDER BY "reviewed_at" DESC NULLS LAST))[1],
    max("reviewed_at"),
    string_agg("review_comment", E'\n' ORDER BY "reviewed_at") FILTER (WHERE "review_comment" IS NOT NULL),
    min("created_at"),
    max("updated_at")
FROM "contribution_entries"
GROUP BY "project_id", "user_id", "week_start";

ALTER TABLE "contribution_entries"
ADD COLUMN "timesheet_id" UUID,
ADD COLUMN "timer_started_at" TIMESTAMP(3);

UPDATE "contribution_entries" AS e
SET "timesheet_id" = t."id"
FROM "timesheets" AS t
WHERE t."project_id" = e."project_id"
  AND t."user_id" = e."user_id"
  AND t."week_start" = e."week_start";

-- Weekly totals had no day, so spread them from Monday at up to 24h a day.
INSERT INTO "contribution_days" ("entry_id", "date", "hours", "updated_at")
SELECT e."id", e."week_start" + d.n, LEAST(24, e."hours" - 24 * d.n), e."updated_at"
FROM "contribution_entries" AS e
CROSS JOIN generate_series(0, 6) AS d(n)
WHERE e."hours" - 24 * d.n > 0;

-- DropForeignKey
ALTER TABLE "contribution_entries" DROP CONSTRAINT "contribution_entries_project_id_fkey";
ALTER TABLE "contribution_entries" DROP CONSTRAINT "contribution_entries_reviewed_by_id_fkey";
ALTER TABLE "contribution_entries" DROP CONSTRAINT "contribution_entries_user_id_fkey";
ALTER TABLE "contribution_entries" DROP CONSTRAINT "contribution_entries_hours_range";
ALTER TABLE "contribution_entries" DROP CONSTRAINT "contribution_entries_week_start_monday";

-- DropIndex
DROP INDEX "contribution_entries_project_id_week_start_idx";
DROP INDEX "contribution_entries_user_id_week_start_idx";

-- AlterTable
ALTER TABLE "contribution_entries" DROP COLUMN "project_id",
DROP COLUMN "review_comment",
DROP COLUMN "review_status",
DROP COLUMN "reviewed_at",
DROP COLUMN "reviewed_by_id",
DROP COLUMN "user_id",
DROP COLUMN "week_start",
ALTER COLUMN "timesheet_id" SET NOT NULL,
ALTER COLUMN "hours" SET DEFAULT 0,
ALTER COLUMN "description" SET DEFAULT '';

-- DropEnum
DROP TYPE "ContributionReviewStatus";

-- CreateIndex
CREATE INDEX "timesheets_project_id_week_start_idx" ON "timesheets"("project_id", "week_start");
CREATE INDEX "timesheets_user_id_week_start_idx" ON "timesheets"("user_id", "week_start");
CREATE INDEX "timesheets_status_idx" ON "timesheets"("status");
CREATE UNIQUE INDEX "timesheets_project_id_user_id_week_start_key" ON "timesheets"("project_id", "user_id", "week_start");
CREATE INDEX "contribution_entries_timesheet_id_idx" ON "contribution_entries"("timesheet_id");

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contribution_entries" ADD CONSTRAINT "contribution_entries_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contribution_days" ADD CONSTRAINT "contribution_days_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "contribution_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity rules that Prisma schema cannot express.
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_week_start_monday" CHECK (EXTRACT(ISODOW FROM "week_start") = 1),
  ADD CONSTRAINT "timesheets_reviewed_when_decided" CHECK (
    "status" NOT IN ('APPROVED', 'CHANGES_REQUESTED') OR "reviewed_at" IS NOT NULL
  );

ALTER TABLE "contribution_entries"
  ADD CONSTRAINT "contribution_entries_hours_range" CHECK ("hours" >= 0 AND "hours" <= 168);

ALTER TABLE "contribution_days"
  ADD CONSTRAINT "contribution_days_hours_range" CHECK ("hours" >= 0 AND "hours" <= 24);
