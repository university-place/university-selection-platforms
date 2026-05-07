-- CreateTable
CREATE TABLE "DepartmentPlacement" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "universityId" INTEGER NOT NULL,
    "programId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "placementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PLACED',
    "submittedBy" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentConfirmation" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "universityId" INTEGER NOT NULL,
    "programId" INTEGER,
    "academicYear" TEXT NOT NULL,
    "confirmationDeadline" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityAdmissionResult" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "universityId" INTEGER NOT NULL,
    "programId" INTEGER,
    "admissionTrackId" INTEGER,
    "academicYear" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decisionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionNotes" TEXT,
    "publishedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniversityAdmissionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentPlacement_academicYear_universityId_status_idx" ON "DepartmentPlacement"("academicYear", "universityId", "status");

-- CreateIndex
CREATE INDEX "DepartmentPlacement_studentId_idx" ON "DepartmentPlacement"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentPlacement_studentId_universityId_programId_academ_key" ON "DepartmentPlacement"("studentId", "universityId", "programId", "academicYear");

-- CreateIndex
CREATE INDEX "StudentConfirmation_studentId_confirmed_confirmationDeadlin_idx" ON "StudentConfirmation"("studentId", "confirmed", "confirmationDeadline");

-- CreateIndex
CREATE INDEX "StudentConfirmation_universityId_academicYear_idx" ON "StudentConfirmation"("universityId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "StudentConfirmation_studentId_universityId_academicYear_key" ON "StudentConfirmation"("studentId", "universityId", "academicYear");

-- CreateIndex
CREATE INDEX "UniversityAdmissionResult_universityId_academicYear_decisio_idx" ON "UniversityAdmissionResult"("universityId", "academicYear", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "UniversityAdmissionResult_studentId_universityId_programId__key" ON "UniversityAdmissionResult"("studentId", "universityId", "programId", "academicYear");

-- AddForeignKey
ALTER TABLE "DepartmentPlacement" ADD CONSTRAINT "DepartmentPlacement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentPlacement" ADD CONSTRAINT "DepartmentPlacement_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentPlacement" ADD CONSTRAINT "DepartmentPlacement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentConfirmation" ADD CONSTRAINT "StudentConfirmation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentConfirmation" ADD CONSTRAINT "StudentConfirmation_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentConfirmation" ADD CONSTRAINT "StudentConfirmation_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityAdmissionResult" ADD CONSTRAINT "UniversityAdmissionResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityAdmissionResult" ADD CONSTRAINT "UniversityAdmissionResult_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityAdmissionResult" ADD CONSTRAINT "UniversityAdmissionResult_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityAdmissionResult" ADD CONSTRAINT "UniversityAdmissionResult_admissionTrackId_fkey" FOREIGN KEY ("admissionTrackId") REFERENCES "AdmissionTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
