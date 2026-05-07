-- AlterTable
ALTER TABLE "University" ADD COLUMN     "canSelfPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "governanceType" TEXT NOT NULL DEFAULT 'moe_controlled',
ADD COLUMN     "requiresMoEApproval" BOOLEAN NOT NULL DEFAULT true;
