/*
  Warnings:

  - Added the required column `password` to the `PlatformAdmin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlatformAdmin" ADD COLUMN     "password" TEXT NOT NULL;
