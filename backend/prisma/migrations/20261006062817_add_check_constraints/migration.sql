-- Integrity rules that Prisma schema cannot express.

ALTER TABLE "contribution_entries"
  ADD CONSTRAINT "contribution_entries_hours_range" CHECK ("hours" > 0 AND "hours" <= 168),
  ADD CONSTRAINT "contribution_entries_week_start_monday" CHECK (EXTRACT(ISODOW FROM "week_start") = 1);

ALTER TABLE "sprints"
  ADD CONSTRAINT "sprints_date_range" CHECK ("end_date" >= "start_date");

ALTER TABLE "task_dependencies"
  ADD CONSTRAINT "task_dependencies_not_self" CHECK ("blocking_task_id" <> "blocked_task_id");

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_key_format" CHECK ("key" ~ '^[A-Z][A-Z0-9]{1,9}$');
