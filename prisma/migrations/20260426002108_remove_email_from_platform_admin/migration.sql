/*
  Warnings:

  - You are about to drop the column `email` on the `PlatformAdmin` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PlatformAdmin_email_key";

-- AlterTable
ALTER TABLE "PlatformAdmin" DROP COLUMN "email";
