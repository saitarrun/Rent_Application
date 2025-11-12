-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "rentEth" DECIMAL NOT NULL,
    "beds" INTEGER NOT NULL,
    "baths" DECIMAL,
    "sqft" INTEGER,
    "amenities" TEXT,
    "photoUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'mock',
    "externalUrl" TEXT,
    "propertyId" TEXT,
    CONSTRAINT "Listing_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "applicantId" TEXT,
    "applicantEmail" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantPhone" TEXT,
    "wallet" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantEth" TEXT NOT NULL,
    "ownerSignedAt" DATETIME,
    "tenantSignedAt" DATETIME,
    "startISO" TEXT NOT NULL,
    "endISO" TEXT NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "monthlyRentEth" DECIMAL NOT NULL,
    "securityDepositEth" DECIMAL NOT NULL,
    "notes" TEXT,
    "chainId" TEXT,
    "txHash" TEXT,
    "termsHash" TEXT,
    "pdfPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "autopayEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lease_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lease" ("chainId", "createdAt", "dueDay", "endISO", "id", "monthlyRentEth", "notes", "ownerId", "ownerSignedAt", "pdfPath", "propertyId", "securityDepositEth", "startISO", "status", "tenantEth", "tenantId", "tenantSignedAt", "termsHash", "txHash", "updatedAt") SELECT "chainId", "createdAt", "dueDay", "endISO", "id", "monthlyRentEth", "notes", "ownerId", "ownerSignedAt", "pdfPath", "propertyId", "securityDepositEth", "startISO", "status", "tenantEth", "tenantId", "tenantSignedAt", "termsHash", "txHash", "updatedAt" FROM "Lease";
DROP TABLE "Lease";
ALTER TABLE "new_Lease" RENAME TO "Lease";
CREATE TABLE "new_Repair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "leaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "preferredWindow" TEXT,
    "scheduledAt" TEXT,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "photosPath" TEXT,
    CONSTRAINT "Repair_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Repair" ("createdAt", "detail", "id", "leaseId", "photosPath", "priority", "status", "title", "updatedAt") SELECT "createdAt", "detail", "id", "leaseId", "photosPath", "priority", "status", "title", "updatedAt" FROM "Repair";
DROP TABLE "Repair";
ALTER TABLE "new_Repair" RENAME TO "Repair";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
