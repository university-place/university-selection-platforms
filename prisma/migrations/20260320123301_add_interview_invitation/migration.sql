-- CreateTable
CREATE TABLE "InterviewInvitation" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "universityId" INTEGER NOT NULL,
    "programId" INTEGER,
    "admissionTrackId" INTEGER,
    "academicYear" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "studentResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "result" TEXT,
    "resultNotes" TEXT,
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewInvitation_studentId_status_idx" ON "InterviewInvitation"("studentId", "status");

-- CreateIndex
CREATE INDEX "InterviewInvitation_universityId_date_idx" ON "InterviewInvitation"("universityId", "date");

-- CreateIndex
CREATE INDEX "InterviewInvitation_academicYear_idx" ON "InterviewInvitation"("academicYear");

-- AddForeignKey
ALTER TABLE "InterviewInvitation" ADD CONSTRAINT "InterviewInvitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewInvitation" ADD CONSTRAINT "InterviewInvitation_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewInvitation" ADD CONSTRAINT "InterviewInvitation_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewInvitation" ADD CONSTRAINT "InterviewInvitation_admissionTrackId_fkey" FOREIGN KEY ("admissionTrackId") REFERENCES "AdmissionTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
