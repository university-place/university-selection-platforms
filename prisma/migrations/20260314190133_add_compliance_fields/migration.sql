-- AlterTable
ALTER TABLE "University" ADD COLUMN     "complianceNotes" TEXT,
ADD COLUMN     "complianceStatus" TEXT,
ADD COLUMN     "lastAdmissionInfoUpdate" TIMESTAMP(3),
ADD COLUMN     "lastCapacityDeclaration" TIMESTAMP(3);
