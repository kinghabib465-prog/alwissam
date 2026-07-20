-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "visitReason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "workPerformed" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "followUpNote" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "treatmentFinished" BOOLEAN NOT NULL DEFAULT false;
