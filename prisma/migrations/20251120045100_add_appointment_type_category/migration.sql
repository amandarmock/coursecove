-- CreateEnum
CREATE TYPE "AppointmentTypeCategory" AS ENUM ('PRIVATE_LESSON', 'APPOINTMENT');

-- AlterTable
ALTER TABLE "appointment_types" ADD COLUMN     "category" "AppointmentTypeCategory" NOT NULL DEFAULT 'APPOINTMENT';
