-- CreateTable
CREATE TABLE "Program" (
    "id" SERIAL NOT NULL,
    "universityId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "degree" TEXT,
    "duration" INTEGER,
    "description" TEXT,
    "eligibilityRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionTrack" (
    "id" SERIAL NOT NULL,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "intakeCapacity" INTEGER NOT NULL,
    "eligibilityRules" JSONB,
    "applicationFee" DOUBLE PRECISION,
    "tuitionFee" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "universityId" INTEGER NOT NULL,
    "programId" INTEGER NOT NULL,
    "admissionTrackId" INTEGER,
    "rank" INTEGER NOT NULL,
    "status" TEXT,
    "decisionDate" TIMESTAMP(3),
    "confirmationDeadline" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Preference_applicationId_rank_key" ON "Preference"("applicationId", "rank");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionTrack" ADD CONSTRAINT "AdmissionTrack_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_admissionTrackId_fkey" FOREIGN KEY ("admissionTrackId") REFERENCES "AdmissionTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
