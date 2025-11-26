/*
  Warnings:

  - You are about to drop the `private_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_type_instructors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session_types` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AppointmentTypeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('UNBOOKED', 'BOOKED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "private_sessions" DROP CONSTRAINT "private_sessions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "private_sessions" DROP CONSTRAINT "private_sessions_instructor_id_fkey";

-- DropForeignKey
ALTER TABLE "private_sessions" DROP CONSTRAINT "private_sessions_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "private_sessions" DROP CONSTRAINT "private_sessions_session_type_id_fkey";

-- DropForeignKey
ALTER TABLE "private_sessions" DROP CONSTRAINT "private_sessions_student_id_fkey";

-- DropForeignKey
ALTER TABLE "session_type_instructors" DROP CONSTRAINT "session_type_instructors_instructor_id_fkey";

-- DropForeignKey
ALTER TABLE "session_type_instructors" DROP CONSTRAINT "session_type_instructors_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "session_type_instructors" DROP CONSTRAINT "session_type_instructors_session_type_id_fkey";

-- DropForeignKey
ALTER TABLE "session_types" DROP CONSTRAINT "session_types_organization_id_fkey";

-- DropTable
DROP TABLE "private_sessions";

-- DropTable
DROP TABLE "session_type_instructors";

-- DropTable
DROP TABLE "session_types";

-- DropEnum
DROP TYPE "SessionStatus";

-- DropEnum
DROP TYPE "SessionTypeStatus";

-- CreateTable
CREATE TABLE "appointment_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "status" "AppointmentTypeStatus" NOT NULL DEFAULT 'DRAFT',
    "default_is_online" BOOLEAN NOT NULL DEFAULT false,
    "default_address" TEXT,
    "default_video_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "appointment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "appointment_type_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'UNBOOKED',
    "is_online" BOOLEAN NOT NULL,
    "video_link" TEXT,
    "location_address" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_type_instructors" (
    "id" TEXT NOT NULL,
    "appointment_type_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_type_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_types_organization_id_idx" ON "appointment_types"("organization_id");

-- CreateIndex
CREATE INDEX "appointment_types_status_idx" ON "appointment_types"("status");

-- CreateIndex
CREATE INDEX "appointment_types_deleted_at_idx" ON "appointment_types"("deleted_at");

-- CreateIndex
CREATE INDEX "appointments_appointment_type_id_idx" ON "appointments"("appointment_type_id");

-- CreateIndex
CREATE INDEX "appointments_student_id_idx" ON "appointments"("student_id");

-- CreateIndex
CREATE INDEX "appointments_instructor_id_idx" ON "appointments"("instructor_id");

-- CreateIndex
CREATE INDEX "appointments_created_by_idx" ON "appointments"("created_by");

-- CreateIndex
CREATE INDEX "appointments_organization_id_idx" ON "appointments"("organization_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_deleted_at_idx" ON "appointments"("deleted_at");

-- CreateIndex
CREATE INDEX "appointment_type_instructors_appointment_type_id_idx" ON "appointment_type_instructors"("appointment_type_id");

-- CreateIndex
CREATE INDEX "appointment_type_instructors_instructor_id_idx" ON "appointment_type_instructors"("instructor_id");

-- CreateIndex
CREATE INDEX "appointment_type_instructors_organization_id_idx" ON "appointment_type_instructors"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_type_instructors_appointment_type_id_instructor_key" ON "appointment_type_instructors"("appointment_type_id", "instructor_id");

-- AddForeignKey
ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointment_type_id_fkey" FOREIGN KEY ("appointment_type_id") REFERENCES "appointment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_type_instructors" ADD CONSTRAINT "appointment_type_instructors_appointment_type_id_fkey" FOREIGN KEY ("appointment_type_id") REFERENCES "appointment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_type_instructors" ADD CONSTRAINT "appointment_type_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_type_instructors" ADD CONSTRAINT "appointment_type_instructors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
