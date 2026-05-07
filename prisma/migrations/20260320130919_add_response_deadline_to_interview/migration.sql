-- AlterTable
ALTER TABLE "InterviewInvitation" ADD COLUMN     "responseDeadline" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "InterviewInvitation_responseDeadline_status_idx" ON "InterviewInvitation"("responseDeadline", "status");
