-- CreateTable
CREATE TABLE "Placement" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "universityId" INTEGER NOT NULL,
    "programId" INTEGER NOT NULL,
    "admissionTrackId" INTEGER,
    "academicYear" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Placement_studentId_universityId_programId_academicYear_key" ON "Placement"("studentId", "universityId", "programId", "academicYear");

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_admissionTrackId_fkey" FOREIGN KEY ("admissionTrackId") REFERENCES "AdmissionTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
