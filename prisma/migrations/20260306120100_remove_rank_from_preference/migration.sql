/*
  Warnings:

  - You are about to drop the column `rank` on the `Preference` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Preference_applicationId_rank_key";

-- AlterTable
ALTER TABLE "Preference" DROP COLUMN "rank";
