-- CreateIndex
CREATE INDEX "appointments_organization_id_status_deleted_at_idx" ON "appointments"("organization_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "appointments_appointment_type_id_status_deleted_at_idx" ON "appointments"("appointment_type_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "instructor_availability_organization_id_instructor_id_idx" ON "instructor_availability"("organization_id", "instructor_id");

-- CreateIndex
CREATE INDEX "invitations_organization_id_status_idx" ON "invitations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "organization_memberships_organization_id_status_idx" ON "organization_memberships"("organization_id", "status");

-- CreateIndex
CREATE INDEX "organization_memberships_user_id_organization_id_role_statu_idx" ON "organization_memberships"("user_id", "organization_id", "role", "status");

-- CreateIndex
CREATE INDEX "webhook_events_status_created_at_idx" ON "webhook_events"("status", "created_at");
