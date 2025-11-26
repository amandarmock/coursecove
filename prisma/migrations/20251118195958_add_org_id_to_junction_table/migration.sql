/*
  Warnings:

  - Added the required column `organization_id` to the `session_type_instructors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "session_type_instructors" ADD COLUMN     "organization_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "session_type_instructors_organization_id_idx" ON "session_type_instructors"("organization_id");

-- AddForeignKey
ALTER TABLE "session_type_instructors" ADD CONSTRAINT "session_type_instructors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
