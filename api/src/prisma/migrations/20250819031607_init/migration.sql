-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "nextRetryAt" TIMESTAMP(3);
