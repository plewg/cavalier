/*
  Warnings:

  - The values [LIVE,NONE,UPCOMING] on the enum `LiveBroadcastContent` will be removed. If these variants are still used in the database, this will fail.
  - The values [PRIVATE,PUBLIC,UNLISTED] on the enum `PrivacyStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [DELETED,FAILED,PROCESSED,REJECTED,UPLOADED] on the enum `UploadStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LiveBroadcastContent_new" AS ENUM ('live', 'none', 'upcoming');
ALTER TABLE "Video" ALTER COLUMN "liveBroadcastContent" TYPE "LiveBroadcastContent_new" USING ("liveBroadcastContent"::text::"LiveBroadcastContent_new");
ALTER TYPE "LiveBroadcastContent" RENAME TO "LiveBroadcastContent_old";
ALTER TYPE "LiveBroadcastContent_new" RENAME TO "LiveBroadcastContent";
DROP TYPE "public"."LiveBroadcastContent_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PrivacyStatus_new" AS ENUM ('private', 'public', 'unlisted');
ALTER TABLE "Video" ALTER COLUMN "privacyStatus" TYPE "PrivacyStatus_new" USING ("privacyStatus"::text::"PrivacyStatus_new");
ALTER TABLE "Playlist" ALTER COLUMN "privacyStatus" TYPE "PrivacyStatus_new" USING ("privacyStatus"::text::"PrivacyStatus_new");
ALTER TYPE "PrivacyStatus" RENAME TO "PrivacyStatus_old";
ALTER TYPE "PrivacyStatus_new" RENAME TO "PrivacyStatus";
DROP TYPE "public"."PrivacyStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UploadStatus_new" AS ENUM ('deleted', 'failed', 'processed', 'rejected', 'uploaded');
ALTER TABLE "Video" ALTER COLUMN "uploadStatus" TYPE "UploadStatus_new" USING ("uploadStatus"::text::"UploadStatus_new");
ALTER TYPE "UploadStatus" RENAME TO "UploadStatus_old";
ALTER TYPE "UploadStatus_new" RENAME TO "UploadStatus";
DROP TYPE "public"."UploadStatus_old";
COMMIT;
