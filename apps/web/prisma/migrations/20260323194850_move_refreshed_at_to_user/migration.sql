/*
  Warnings:

  - You are about to drop the column `lastRefreshedAt` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "lastRefreshedAt";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastRefreshedAt" TIMESTAMP(3);
