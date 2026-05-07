-- CreateTable
CREATE TABLE "Appeal" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "preferenceId" INTEGER,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "Preference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
