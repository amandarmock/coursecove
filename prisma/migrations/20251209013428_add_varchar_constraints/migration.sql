/*
  Warnings:

  - You are about to alter the column `name` on the `appointment_types` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `title` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `location_address` on the `appointments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `name` on the `business_locations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `address` on the `business_locations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `city` on the `business_locations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `state` on the `business_locations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `zip_code` on the `business_locations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE "appointment_types" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "title" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "location_address" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "business_locations" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "address" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "city" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "state" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "zip_code" SET DATA TYPE VARCHAR(20);

-- CreateIndex
CREATE INDEX "appointment_types_organization_id_status_deleted_at_idx" ON "appointment_types"("organization_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "appointment_types_organization_id_category_deleted_at_idx" ON "appointment_types"("organization_id", "category", "deleted_at");

-- CreateIndex
CREATE INDEX "business_locations_organization_id_is_active_deleted_at_idx" ON "business_locations"("organization_id", "is_active", "deleted_at");
