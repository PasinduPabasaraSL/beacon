-- Integrity rules for the academic calendar that Prisma schema cannot express.

ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_semester_complete" CHECK (("semester_start" IS NULL) = ("semester_weeks" IS NULL)),
  ADD CONSTRAINT "workspaces_semester_start_monday" CHECK (EXTRACT(ISODOW FROM "semester_start") = 1),
  ADD CONSTRAINT "workspaces_semester_weeks_range" CHECK ("semester_weeks" BETWEEN 1 AND 52);

ALTER TABLE "semester_breaks"
  ADD CONSTRAINT "semester_breaks_week_start_monday" CHECK (EXTRACT(ISODOW FROM "week_start") = 1);
