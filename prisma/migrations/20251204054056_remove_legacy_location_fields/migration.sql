/*
  Warnings:

  - You are about to drop the column `default_address` on the `appointment_types` table. All the data in the column will be lost.
  - You are about to drop the column `default_is_online` on the `appointment_types` table. All the data in the column will be lost.
  - You are about to drop the column `default_video_link` on the `appointment_types` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "appointment_types" DROP COLUMN "default_address",
DROP COLUMN "default_is_online",
DROP COLUMN "default_video_link";
