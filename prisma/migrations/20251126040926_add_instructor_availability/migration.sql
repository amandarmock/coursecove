-- AlterTable
ALTER TABLE "users" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- CreateTable
CREATE TABLE "instructor_availability" (
    "id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instructor_availability_instructor_id_idx" ON "instructor_availability"("instructor_id");

-- CreateIndex
CREATE INDEX "instructor_availability_organization_id_idx" ON "instructor_availability"("organization_id");

-- CreateIndex
CREATE INDEX "instructor_availability_instructor_id_dayOfWeek_idx" ON "instructor_availability"("instructor_id", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "instructor_availability" ADD CONSTRAINT "instructor_availability_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_availability" ADD CONSTRAINT "instructor_availability_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
