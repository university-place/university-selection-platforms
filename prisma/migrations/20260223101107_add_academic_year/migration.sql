-- 1) Create AcademicYear table (optional but recommended)
CREATE TABLE IF NOT EXISTS "AcademicYear" (
  "id" SERIAL NOT NULL,
  "year" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYear_year_key" ON "AcademicYear"("year");

-- 2) Add academicYear column as nullable FIRST
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;

-- 3) Backfill existing rows with your chosen year (CHANGE THIS IF NEEDED)
UPDATE "Student" SET "academicYear" = '2024/2025' WHERE "academicYear" IS NULL;

-- 4) Now make academicYear NOT NULL
ALTER TABLE "Student" ALTER COLUMN "academicYear" SET NOT NULL;

-- 4.1) Add isActive column (new in schema). Make NOT NULL with a default so existing rows get a value.
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 4.2) (Optional) If you want existing rows to be inactive by default, run:
-- UPDATE "Student" SET "isActive" = false WHERE "academicYear" <> '2024/2025';

-- 5) Drop old unique index on examID (since examID can repeat across years)
DROP INDEX IF EXISTS "Student_examID_key";

-- 6) Create composite unique index (examID + academicYear)
CREATE UNIQUE INDEX IF NOT EXISTS "Student_examID_academicYear_key" ON "Student" ("examID", "academicYear");

-- 7) Create index for faster queries on academicYear + isActive
CREATE INDEX IF NOT EXISTS "Student_academicYear_isActive_idx" ON "Student" ("academicYear", "isActive");