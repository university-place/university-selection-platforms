/*
  Warnings:

  - You are about to drop the column `canSelfPublish` on the `University` table. All the data in the column will be lost.
  - You are about to drop the column `governanceType` on the `University` table. All the data in the column will be lost.
  - You are about to drop the column `requiresMoEApproval` on the `University` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "intakeCapacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "University" DROP COLUMN "canSelfPublish",
DROP COLUMN "governanceType",
DROP COLUMN "requiresMoEApproval";

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" SERIAL NOT NULL,
    "programId" INTEGER NOT NULL,
    "minScore" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 350,
    "region" TEXT,
    "disabilityStatus" TEXT,
    "stream" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
