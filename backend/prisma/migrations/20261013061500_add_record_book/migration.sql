-- CreateEnum
CREATE TYPE "MeetingMode" AS ENUM ('ONLINE_UPDATE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "MeetingPhase" AS ENUM ('PROBLEM_IDENTIFICATION', 'ANALYSIS_DESIGN', 'SYSTEM_DESIGN', 'DEVELOPMENT_EVALUATION');

-- CreateEnum
CREATE TYPE "MeetingRecordStatus" AS ENUM ('SUBMITTED', 'CHANGES_REQUESTED', 'CERTIFIED');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('UPLOAD', 'DRAWN', 'TYPED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "meeting_counter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "registration_number" TEXT;

-- CreateTable
CREATE TABLE "user_signatures" (
    "user_id" UUID NOT NULL,
    "image" TEXT NOT NULL,
    "method" "SignatureMethod" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signatures_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "record_books" (
    "project_id" UUID NOT NULL,
    "module_title" TEXT NOT NULL DEFAULT 'IS2901 - Software Development Project',
    "level" TEXT NOT NULL DEFAULT 'Level 02',
    "batch" TEXT,
    "group_name" TEXT,
    "department" TEXT,
    "faculty" TEXT,
    "university" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_books_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "record_book_signatures" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "image" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_book_signatures_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "meeting_records" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "phase" "MeetingPhase" NOT NULL,
    "mode" "MeetingMode" NOT NULL,
    "meeting_date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "status" "MeetingRecordStatus" NOT NULL DEFAULT 'SUBMITTED',
    "supervisor_comment" TEXT,
    "certified_by_id" UUID,
    "certified_at" TIMESTAMP(3),
    "signature_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attendees" (
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "meeting_attendees_pkey" PRIMARY KEY ("meeting_id","user_id")
);

-- CreateIndex
CREATE INDEX "meeting_records_project_id_phase_idx" ON "meeting_records"("project_id", "phase");

-- CreateIndex
CREATE INDEX "meeting_records_project_id_status_idx" ON "meeting_records"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_records_project_id_number_key" ON "meeting_records"("project_id", "number");

-- CreateIndex
CREATE INDEX "meeting_attendees_user_id_idx" ON "meeting_attendees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_registration_number_key" ON "users"("registration_number");

-- AddForeignKey
ALTER TABLE "user_signatures" ADD CONSTRAINT "user_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_books" ADD CONSTRAINT "record_books_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_book_signatures" ADD CONSTRAINT "record_book_signatures_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_book_signatures" ADD CONSTRAINT "record_book_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_records" ADD CONSTRAINT "meeting_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_records" ADD CONSTRAINT "meeting_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_records" ADD CONSTRAINT "meeting_records_certified_by_id_fkey" FOREIGN KEY ("certified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meeting_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

