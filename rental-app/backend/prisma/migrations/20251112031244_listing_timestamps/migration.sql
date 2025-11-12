/*
  Warnings:

  - Added the required column `updatedAt` to the `Listing` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
INSERT INTO "new_Listing" ("address", "amenities", "available", "baths", "beds", "city", "externalUrl", "id", "ownerId", "photoUrl", "propertyId", "rentEth", "source", "sqft", "state", "title") SELECT "address", "amenities", "available", "baths", "beds", "city", "externalUrl", "id", "ownerId", "photoUrl", "propertyId", "rentEth", "source", "sqft", "state", "title" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
