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
    CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lease_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lease" ("chainId", "createdAt", "dueDay", "endISO", "id", "monthlyRentEth", "notes", "ownerId", "ownerSignedAt", "pdfPath", "propertyId", "securityDepositEth", "startISO", "status", "tenantEth", "tenantId", "tenantSignedAt", "termsHash", "txHash", "updatedAt") SELECT "chainId", "createdAt", "dueDay", "endISO", "id", "monthlyRentEth", "notes", "ownerId", "ownerSignedAt", "pdfPath", "propertyId", "securityDepositEth", "startISO", "status", "tenantEth", "tenantId", "tenantSignedAt", "termsHash", "txHash", "updatedAt" FROM "Lease";
DROP TABLE "Lease";
ALTER TABLE "new_Lease" RENAME TO "Lease";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
