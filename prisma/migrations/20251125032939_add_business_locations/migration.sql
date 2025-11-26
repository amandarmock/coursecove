-- CreateEnum
CREATE TYPE "LocationMode" AS ENUM ('BUSINESS_LOCATION', 'ONLINE', 'STUDENT_LOCATION');

-- AlterTable
ALTER TABLE "appointment_types" ADD COLUMN     "business_location_id" TEXT,
ADD COLUMN     "location_mode" "LocationMode" NOT NULL DEFAULT 'BUSINESS_LOCATION';

-- CreateTable
CREATE TABLE "business_locations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_locations_organization_id_idx" ON "business_locations"("organization_id");

-- CreateIndex
CREATE INDEX "business_locations_is_active_idx" ON "business_locations"("is_active");

-- CreateIndex
CREATE INDEX "business_locations_deleted_at_idx" ON "business_locations"("deleted_at");

-- CreateIndex
CREATE INDEX "appointment_types_business_location_id_idx" ON "appointment_types"("business_location_id");

-- AddForeignKey
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_business_location_id_fkey" FOREIGN KEY ("business_location_id") REFERENCES "business_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
