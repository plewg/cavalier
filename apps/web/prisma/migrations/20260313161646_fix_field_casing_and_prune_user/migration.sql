/*
  Warnings:

  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastRefreshedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `raw` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayName",
DROP COLUMN "lastRefreshedAt",
DROP COLUMN "raw";
