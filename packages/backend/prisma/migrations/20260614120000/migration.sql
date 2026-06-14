-- AlterTable
ALTER TABLE "Question" ADD COLUMN "options" TEXT[] NOT NULL DEFAULT '{}';
