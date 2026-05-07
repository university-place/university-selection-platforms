/*
  Warnings:

  - A unique constraint covering the columns `[apiKey]` on the table `University` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "University" ADD COLUMN     "apiKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "University_apiKey_key" ON "University"("apiKey");
