/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `PlatformAdmin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `PlatformAdmin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlatformAdmin" ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_username_key" ON "PlatformAdmin"("username");
