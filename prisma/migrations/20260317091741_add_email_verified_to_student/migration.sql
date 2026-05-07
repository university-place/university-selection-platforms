-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StudentVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "StudentVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentVerificationToken_token_key" ON "StudentVerificationToken"("token");

-- CreateIndex
CREATE INDEX "StudentVerificationToken_token_idx" ON "StudentVerificationToken"("token");

-- CreateIndex
CREATE INDEX "StudentVerificationToken_expiresAt_idx" ON "StudentVerificationToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "StudentVerificationToken" ADD CONSTRAINT "StudentVerificationToken_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
