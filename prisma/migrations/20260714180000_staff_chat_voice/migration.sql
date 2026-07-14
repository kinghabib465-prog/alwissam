-- AlterTable
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioUrl" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
