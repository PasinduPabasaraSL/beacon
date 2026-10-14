-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logo" TEXT;

