-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "expectedOutput" TEXT,
ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "testCases" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'DISCUSSION';
