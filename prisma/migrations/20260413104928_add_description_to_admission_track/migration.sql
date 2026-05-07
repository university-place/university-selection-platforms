/*
  Warnings:

  - You are about to drop the column `tuitionFee` on the `AdmissionTrack` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AdmissionTrack" DROP COLUMN "tuitionFee",
ADD COLUMN     "description" TEXT;
