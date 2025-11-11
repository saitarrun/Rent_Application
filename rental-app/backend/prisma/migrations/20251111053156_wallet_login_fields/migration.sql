-- AlterTable
ALTER TABLE "Lease" ADD COLUMN "ownerSignedAt" DATETIME;
ALTER TABLE "Lease" ADD COLUMN "tenantSignedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "loginNonce" TEXT;
