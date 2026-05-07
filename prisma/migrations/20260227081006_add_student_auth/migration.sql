/*
  Warnings:

  - You are about to drop the column `totalScore` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "totalScore",
ADD COLUMN     "isRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;
