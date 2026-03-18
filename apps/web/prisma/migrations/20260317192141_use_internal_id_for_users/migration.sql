/*
  Warnings:

  - You are about to alter the column `userId` on the `Session` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(24)`.
  - You are about to alter the column `userId` on the `Subscription` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(24)`.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `googleId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "userId" SET DATA TYPE VARCHAR(24);

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "userId" SET DATA TYPE VARCHAR(24);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleId" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
