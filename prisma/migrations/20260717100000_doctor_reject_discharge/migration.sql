-- رفض/صرف المريض من الطبيب — سبب للسكرتيرة وسبب لطيف للمريض
ALTER TYPE "WaitingRoomStatus" ADD VALUE IF NOT EXISTS 'REJECTED_BY_DOCTOR';

ALTER TABLE "WaitingRoomEntry"
  ADD COLUMN IF NOT EXISTS "doctorPrivateReason" TEXT,
  ADD COLUMN IF NOT EXISTS "doctorPublicReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
