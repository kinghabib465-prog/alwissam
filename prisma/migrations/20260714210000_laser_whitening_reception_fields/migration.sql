-- تبييض الأسنان بالليزر + مرض يعاني منه على طلب الاستقبال
ALTER TYPE "AppointmentType" ADD VALUE 'LASER_WHITENING';

ALTER TABLE "AppointmentRequest" ADD COLUMN IF NOT EXISTS "chronicIllnesses" TEXT;
