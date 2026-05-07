-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "lastSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "submissionCount" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "preferenceId" INTEGER,
ADD COLUMN     "scope" TEXT DEFAULT 'general',
ADD COLUMN     "universityId" INTEGER;

-- AlterTable
ALTER TABLE "Preference" ADD COLUMN     "cancelledAt" TIMESTAMP(6),
ADD COLUMN     "cancelledReason" TEXT,
ADD COLUMN     "isCancelled" BOOLEAN DEFAULT false,
ADD COLUMN     "studentId" INTEGER,
ADD COLUMN     "submissionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "accreditation" TEXT,
ADD COLUMN     "achievements" TEXT,
ADD COLUMN     "applicationStartDate" TIMESTAMP(6),
ADD COLUMN     "facilities" TEXT,
ADD COLUMN     "history" TEXT,
ADD COLUMN     "isAutonomous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "keyFacts" JSONB,
ADD COLUMN     "researchAreas" TEXT,
ADD COLUMN     "studentLife" TEXT;

-- CreateIndex
CREATE INDEX "Document_universityId_idx" ON "Document"("universityId");

-- CreateIndex
CREATE INDEX "Document_preferenceId_idx" ON "Document"("preferenceId");

-- CreateIndex
CREATE INDEX "Document_scope_idx" ON "Document"("scope");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "Preference"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
