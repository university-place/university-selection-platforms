-- DropForeignKey
ALTER TABLE "Preference" DROP CONSTRAINT "Preference_programId_fkey";

-- AlterTable
ALTER TABLE "Preference" ALTER COLUMN "programId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
