-- CreateEnum
CREATE TYPE "SessionTypeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('UNBOOKED', 'BOOKED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "permission_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "status" "SessionTypeStatus" NOT NULL DEFAULT 'DRAFT',
    "default_is_online" BOOLEAN NOT NULL DEFAULT false,
    "default_address" TEXT,
    "default_video_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "session_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_sessions" (
    "id" TEXT NOT NULL,
    "session_type_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'UNBOOKED',
    "is_online" BOOLEAN NOT NULL,
    "video_link" TEXT,
    "location_address" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "private_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_type_instructors" (
    "id" TEXT NOT NULL,
    "session_type_id" TEXT NOT NULL,
    "instructor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_type_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "role_permissions_role_idx" ON "role_permissions"("role");

-- CreateIndex
CREATE INDEX "role_permissions_organization_id_idx" ON "role_permissions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_id_organization_id_key" ON "role_permissions"("role", "permission_id", "organization_id");

-- CreateIndex
CREATE INDEX "session_types_organization_id_idx" ON "session_types"("organization_id");

-- CreateIndex
CREATE INDEX "session_types_status_idx" ON "session_types"("status");

-- CreateIndex
CREATE INDEX "session_types_deleted_at_idx" ON "session_types"("deleted_at");

-- CreateIndex
CREATE INDEX "private_sessions_session_type_id_idx" ON "private_sessions"("session_type_id");

-- CreateIndex
CREATE INDEX "private_sessions_student_id_idx" ON "private_sessions"("student_id");

-- CreateIndex
CREATE INDEX "private_sessions_instructor_id_idx" ON "private_sessions"("instructor_id");

-- CreateIndex
CREATE INDEX "private_sessions_created_by_idx" ON "private_sessions"("created_by");

-- CreateIndex
CREATE INDEX "private_sessions_organization_id_idx" ON "private_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "private_sessions_status_idx" ON "private_sessions"("status");

-- CreateIndex
CREATE INDEX "private_sessions_deleted_at_idx" ON "private_sessions"("deleted_at");

-- CreateIndex
CREATE INDEX "session_type_instructors_session_type_id_idx" ON "session_type_instructors"("session_type_id");

-- CreateIndex
CREATE INDEX "session_type_instructors_instructor_id_idx" ON "session_type_instructors"("instructor_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_type_instructors_session_type_id_instructor_id_key" ON "session_type_instructors"("session_type_id", "instructor_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_types" ADD CONSTRAINT "session_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_sessions" ADD CONSTRAINT "private_sessions_session_type_id_fkey" FOREIGN KEY ("session_type_id") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_sessions" ADD CONSTRAINT "private_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_sessions" ADD CONSTRAINT "private_sessions_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_sessions" ADD CONSTRAINT "private_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_sessions" ADD CONSTRAINT "private_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_type_instructors" ADD CONSTRAINT "session_type_instructors_session_type_id_fkey" FOREIGN KEY ("session_type_id") REFERENCES "session_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_type_instructors" ADD CONSTRAINT "session_type_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "organization_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
