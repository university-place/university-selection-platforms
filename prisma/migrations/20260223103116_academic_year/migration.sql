-- DropIndex
DROP INDEX "Student_studentNationalID_key";

-- AlterTable
ALTER TABLE "AcademicYear" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "status" TEXT;
