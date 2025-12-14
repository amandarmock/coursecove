


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."AppointmentStatus" AS ENUM (
    'UNBOOKED',
    'BOOKED',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."AppointmentStatus" OWNER TO "postgres";


CREATE TYPE "public"."AppointmentTypeCategory" AS ENUM (
    'PRIVATE_LESSON',
    'APPOINTMENT'
);


ALTER TYPE "public"."AppointmentTypeCategory" OWNER TO "postgres";


CREATE TYPE "public"."AppointmentTypeStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'UNPUBLISHED'
);


ALTER TYPE "public"."AppointmentTypeStatus" OWNER TO "postgres";


CREATE TYPE "public"."InvitationStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE "public"."InvitationStatus" OWNER TO "postgres";


CREATE TYPE "public"."LocationMode" AS ENUM (
    'BUSINESS_LOCATION',
    'ONLINE',
    'STUDENT_LOCATION'
);


ALTER TYPE "public"."LocationMode" OWNER TO "postgres";


CREATE TYPE "public"."MembershipRole" AS ENUM (
    'SUPER_ADMIN',
    'INSTRUCTOR',
    'STUDENT',
    'GUARDIAN'
);


ALTER TYPE "public"."MembershipRole" OWNER TO "postgres";


CREATE TYPE "public"."MembershipStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DELETED',
    'REMOVED'
);


ALTER TYPE "public"."MembershipStatus" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

-- Note: _prisma_migrations table removed during Supabase-only migration (Dec 2025)
-- See ADR-004: docs/architecture/adrs/004-supabase-only-architecture.md

CREATE TABLE IF NOT EXISTS "public"."appointment_type_instructors" (
    "id" "text" NOT NULL,
    "appointment_type_id" "text" NOT NULL,
    "instructor_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."appointment_type_instructors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_types" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "duration" integer NOT NULL,
    "status" "public"."AppointmentTypeStatus" DEFAULT 'DRAFT'::"public"."AppointmentTypeStatus" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "deleted_at" timestamp(3) without time zone,
    "category" "public"."AppointmentTypeCategory" DEFAULT 'APPOINTMENT'::"public"."AppointmentTypeCategory" NOT NULL,
    "business_location_id" "text",
    "location_mode" "public"."LocationMode" DEFAULT 'BUSINESS_LOCATION'::"public"."LocationMode" NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."appointment_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "text" NOT NULL,
    "appointment_type_id" "text",
    "organization_id" "text" NOT NULL,
    "student_id" "text" NOT NULL,
    "instructor_id" "text" NOT NULL,
    "created_by" "text" NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" "text",
    "duration" integer NOT NULL,
    "status" "public"."AppointmentStatus" DEFAULT 'UNBOOKED'::"public"."AppointmentStatus" NOT NULL,
    "is_online" boolean NOT NULL,
    "video_link" "text",
    "location_address" character varying(200),
    "notes" "text",
    "version" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "deleted_at" timestamp(3) without time zone
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_locations" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "name" character varying(100) NOT NULL,
    "address" character varying(200) NOT NULL,
    "city" character varying(100) NOT NULL,
    "state" character varying(50) NOT NULL,
    "zip_code" character varying(20) NOT NULL,
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "deleted_at" timestamp(3) without time zone
);


ALTER TABLE "public"."business_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructor_availability" (
    "id" "text" NOT NULL,
    "instructor_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."instructor_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "invited_by" "text" NOT NULL,
    "accepted_by" "text",
    "email" "text" NOT NULL,
    "role" "public"."MembershipRole" NOT NULL,
    "token" "text" NOT NULL,
    "status" "public"."InvitationStatus" DEFAULT 'PENDING'::"public"."InvitationStatus" NOT NULL,
    "expires_at" timestamp(3) without time zone NOT NULL,
    "accepted_at" timestamp(3) without time zone,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_memberships" (
    "id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "role" "public"."MembershipRole" NOT NULL,
    "clerk_membership_id" "text",
    "status" "public"."MembershipStatus" DEFAULT 'ACTIVE'::"public"."MembershipStatus" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "removed_at" timestamp(3) without time zone,
    "removed_by" "text"
);


ALTER TABLE "public"."organization_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "subdomain" "text",
    "email" "text",
    "phone" "text",
    "clerk_organization_id" "text",
    "status" "public"."MembershipStatus" DEFAULT 'ACTIVE'::"public"."MembershipStatus" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "text" NOT NULL,
    "role" "public"."MembershipRole" NOT NULL,
    "permission_id" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "clerk_user_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "status" "public"."MembershipStatus" DEFAULT 'ACTIVE'::"public"."MembershipStatus" NOT NULL,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "text" NOT NULL,
    "webhook_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "processed_at" timestamp(3) without time zone,
    "created_at" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(3) without time zone NOT NULL,
    "deleted_at" timestamp(3) without time zone
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


-- _prisma_migrations primary key removed (table no longer exists)

ALTER TABLE ONLY "public"."appointment_type_instructors"
    ADD CONSTRAINT "appointment_type_instructors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_types"
    ADD CONSTRAINT "appointment_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_locations"
    ADD CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructor_availability"
    ADD CONSTRAINT "instructor_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE INDEX "appointment_type_instructors_appointment_type_id_idx" ON "public"."appointment_type_instructors" USING "btree" ("appointment_type_id");



CREATE UNIQUE INDEX "appointment_type_instructors_appointment_type_id_instructor_key" ON "public"."appointment_type_instructors" USING "btree" ("appointment_type_id", "instructor_id");



CREATE INDEX "appointment_type_instructors_instructor_id_idx" ON "public"."appointment_type_instructors" USING "btree" ("instructor_id");



CREATE INDEX "appointment_type_instructors_organization_id_idx" ON "public"."appointment_type_instructors" USING "btree" ("organization_id");



CREATE INDEX "appointment_types_business_location_id_idx" ON "public"."appointment_types" USING "btree" ("business_location_id");



CREATE INDEX "appointment_types_deleted_at_idx" ON "public"."appointment_types" USING "btree" ("deleted_at");



CREATE INDEX "appointment_types_organization_id_category_deleted_at_idx" ON "public"."appointment_types" USING "btree" ("organization_id", "category", "deleted_at");



CREATE INDEX "appointment_types_organization_id_idx" ON "public"."appointment_types" USING "btree" ("organization_id");



CREATE INDEX "appointment_types_organization_id_status_deleted_at_idx" ON "public"."appointment_types" USING "btree" ("organization_id", "status", "deleted_at");



CREATE INDEX "appointment_types_status_idx" ON "public"."appointment_types" USING "btree" ("status");



CREATE INDEX "appointments_appointment_type_id_idx" ON "public"."appointments" USING "btree" ("appointment_type_id");



CREATE INDEX "appointments_appointment_type_id_status_deleted_at_idx" ON "public"."appointments" USING "btree" ("appointment_type_id", "status", "deleted_at");



CREATE INDEX "appointments_created_by_idx" ON "public"."appointments" USING "btree" ("created_by");



CREATE INDEX "appointments_deleted_at_idx" ON "public"."appointments" USING "btree" ("deleted_at");



CREATE INDEX "appointments_instructor_id_idx" ON "public"."appointments" USING "btree" ("instructor_id");



CREATE INDEX "appointments_organization_id_idx" ON "public"."appointments" USING "btree" ("organization_id");



CREATE INDEX "appointments_organization_id_status_deleted_at_idx" ON "public"."appointments" USING "btree" ("organization_id", "status", "deleted_at");



CREATE INDEX "appointments_status_idx" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "appointments_student_id_idx" ON "public"."appointments" USING "btree" ("student_id");



CREATE INDEX "business_locations_deleted_at_idx" ON "public"."business_locations" USING "btree" ("deleted_at");



CREATE INDEX "business_locations_is_active_idx" ON "public"."business_locations" USING "btree" ("is_active");



CREATE INDEX "business_locations_organization_id_idx" ON "public"."business_locations" USING "btree" ("organization_id");



CREATE INDEX "business_locations_organization_id_is_active_deleted_at_idx" ON "public"."business_locations" USING "btree" ("organization_id", "is_active", "deleted_at");



CREATE INDEX "instructor_availability_instructor_id_dayOfWeek_idx" ON "public"."instructor_availability" USING "btree" ("instructor_id", "dayOfWeek");



CREATE INDEX "instructor_availability_instructor_id_idx" ON "public"."instructor_availability" USING "btree" ("instructor_id");



CREATE INDEX "instructor_availability_organization_id_idx" ON "public"."instructor_availability" USING "btree" ("organization_id");



CREATE INDEX "instructor_availability_organization_id_instructor_id_idx" ON "public"."instructor_availability" USING "btree" ("organization_id", "instructor_id");



CREATE INDEX "invitations_email_idx" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "invitations_expires_at_idx" ON "public"."invitations" USING "btree" ("expires_at");



CREATE INDEX "invitations_organization_id_idx" ON "public"."invitations" USING "btree" ("organization_id");



CREATE INDEX "invitations_organization_id_status_idx" ON "public"."invitations" USING "btree" ("organization_id", "status");



CREATE INDEX "invitations_status_idx" ON "public"."invitations" USING "btree" ("status");



CREATE INDEX "invitations_token_idx" ON "public"."invitations" USING "btree" ("token");



CREATE UNIQUE INDEX "invitations_token_key" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "organization_memberships_clerk_membership_id_idx" ON "public"."organization_memberships" USING "btree" ("clerk_membership_id");



CREATE UNIQUE INDEX "organization_memberships_clerk_membership_id_key" ON "public"."organization_memberships" USING "btree" ("clerk_membership_id");



CREATE INDEX "organization_memberships_organization_id_idx" ON "public"."organization_memberships" USING "btree" ("organization_id");



CREATE INDEX "organization_memberships_organization_id_status_idx" ON "public"."organization_memberships" USING "btree" ("organization_id", "status");



CREATE UNIQUE INDEX "organization_memberships_organization_id_user_id_key" ON "public"."organization_memberships" USING "btree" ("organization_id", "user_id");



CREATE INDEX "organization_memberships_role_idx" ON "public"."organization_memberships" USING "btree" ("role");



CREATE INDEX "organization_memberships_user_id_idx" ON "public"."organization_memberships" USING "btree" ("user_id");



CREATE INDEX "organization_memberships_user_id_organization_id_role_statu_idx" ON "public"."organization_memberships" USING "btree" ("user_id", "organization_id", "role", "status");



CREATE INDEX "organizations_clerk_organization_id_idx" ON "public"."organizations" USING "btree" ("clerk_organization_id");



CREATE UNIQUE INDEX "organizations_clerk_organization_id_key" ON "public"."organizations" USING "btree" ("clerk_organization_id");



CREATE UNIQUE INDEX "organizations_slug_key" ON "public"."organizations" USING "btree" ("slug");



CREATE INDEX "organizations_status_idx" ON "public"."organizations" USING "btree" ("status");



CREATE INDEX "organizations_subdomain_idx" ON "public"."organizations" USING "btree" ("subdomain");



CREATE UNIQUE INDEX "organizations_subdomain_key" ON "public"."organizations" USING "btree" ("subdomain");



CREATE UNIQUE INDEX "permissions_resource_action_key" ON "public"."permissions" USING "btree" ("resource", "action");



CREATE INDEX "permissions_resource_idx" ON "public"."permissions" USING "btree" ("resource");



CREATE INDEX "role_permissions_organization_id_idx" ON "public"."role_permissions" USING "btree" ("organization_id");



CREATE INDEX "role_permissions_role_idx" ON "public"."role_permissions" USING "btree" ("role");



CREATE UNIQUE INDEX "role_permissions_role_permission_id_organization_id_key" ON "public"."role_permissions" USING "btree" ("role", "permission_id", "organization_id");



CREATE INDEX "users_clerk_user_id_idx" ON "public"."users" USING "btree" ("clerk_user_id");



CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "public"."users" USING "btree" ("clerk_user_id");



CREATE INDEX "users_email_idx" ON "public"."users" USING "btree" ("email");



CREATE UNIQUE INDEX "users_email_key" ON "public"."users" USING "btree" ("email");



CREATE INDEX "users_status_idx" ON "public"."users" USING "btree" ("status");



CREATE INDEX "webhook_events_created_at_idx" ON "public"."webhook_events" USING "btree" ("created_at");



CREATE INDEX "webhook_events_event_type_idx" ON "public"."webhook_events" USING "btree" ("event_type");



CREATE INDEX "webhook_events_status_created_at_idx" ON "public"."webhook_events" USING "btree" ("status", "created_at");



CREATE INDEX "webhook_events_status_idx" ON "public"."webhook_events" USING "btree" ("status");



CREATE UNIQUE INDEX "webhook_events_webhook_id_key" ON "public"."webhook_events" USING "btree" ("webhook_id");



ALTER TABLE ONLY "public"."appointment_type_instructors"
    ADD CONSTRAINT "appointment_type_instructors_appointment_type_id_fkey" FOREIGN KEY ("appointment_type_id") REFERENCES "public"."appointment_types"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_type_instructors"
    ADD CONSTRAINT "appointment_type_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."organization_memberships"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_type_instructors"
    ADD CONSTRAINT "appointment_type_instructors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_types"
    ADD CONSTRAINT "appointment_types_business_location_id_fkey" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_types"
    ADD CONSTRAINT "appointment_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_appointment_type_id_fkey" FOREIGN KEY ("appointment_type_id") REFERENCES "public"."appointment_types"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."organization_memberships"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."organization_memberships"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."organization_memberships"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_locations"
    ADD CONSTRAINT "business_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_availability"
    ADD CONSTRAINT "instructor_availability_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."organization_memberships"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructor_availability"
    ADD CONSTRAINT "instructor_availability_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON UPDATE CASCADE ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;







































































































































































































drop extension if exists "pg_net";

-- _prisma_migrations revoke statements removed (table no longer exists)

revoke delete on table "public"."appointment_type_instructors" from "anon";

revoke insert on table "public"."appointment_type_instructors" from "anon";

revoke references on table "public"."appointment_type_instructors" from "anon";

revoke select on table "public"."appointment_type_instructors" from "anon";

revoke trigger on table "public"."appointment_type_instructors" from "anon";

revoke truncate on table "public"."appointment_type_instructors" from "anon";

revoke update on table "public"."appointment_type_instructors" from "anon";

revoke delete on table "public"."appointment_type_instructors" from "authenticated";

revoke insert on table "public"."appointment_type_instructors" from "authenticated";

revoke references on table "public"."appointment_type_instructors" from "authenticated";

revoke select on table "public"."appointment_type_instructors" from "authenticated";

revoke trigger on table "public"."appointment_type_instructors" from "authenticated";

revoke truncate on table "public"."appointment_type_instructors" from "authenticated";

revoke update on table "public"."appointment_type_instructors" from "authenticated";

revoke delete on table "public"."appointment_type_instructors" from "service_role";

revoke insert on table "public"."appointment_type_instructors" from "service_role";

revoke references on table "public"."appointment_type_instructors" from "service_role";

revoke select on table "public"."appointment_type_instructors" from "service_role";

revoke trigger on table "public"."appointment_type_instructors" from "service_role";

revoke truncate on table "public"."appointment_type_instructors" from "service_role";

revoke update on table "public"."appointment_type_instructors" from "service_role";

revoke delete on table "public"."appointment_types" from "anon";

revoke insert on table "public"."appointment_types" from "anon";

revoke references on table "public"."appointment_types" from "anon";

revoke select on table "public"."appointment_types" from "anon";

revoke trigger on table "public"."appointment_types" from "anon";

revoke truncate on table "public"."appointment_types" from "anon";

revoke update on table "public"."appointment_types" from "anon";

revoke delete on table "public"."appointment_types" from "authenticated";

revoke insert on table "public"."appointment_types" from "authenticated";

revoke references on table "public"."appointment_types" from "authenticated";

revoke select on table "public"."appointment_types" from "authenticated";

revoke trigger on table "public"."appointment_types" from "authenticated";

revoke truncate on table "public"."appointment_types" from "authenticated";

revoke update on table "public"."appointment_types" from "authenticated";

revoke delete on table "public"."appointment_types" from "service_role";

revoke insert on table "public"."appointment_types" from "service_role";

revoke references on table "public"."appointment_types" from "service_role";

revoke select on table "public"."appointment_types" from "service_role";

revoke trigger on table "public"."appointment_types" from "service_role";

revoke truncate on table "public"."appointment_types" from "service_role";

revoke update on table "public"."appointment_types" from "service_role";

revoke delete on table "public"."appointments" from "anon";

revoke insert on table "public"."appointments" from "anon";

revoke references on table "public"."appointments" from "anon";

revoke select on table "public"."appointments" from "anon";

revoke trigger on table "public"."appointments" from "anon";

revoke truncate on table "public"."appointments" from "anon";

revoke update on table "public"."appointments" from "anon";

revoke delete on table "public"."appointments" from "authenticated";

revoke insert on table "public"."appointments" from "authenticated";

revoke references on table "public"."appointments" from "authenticated";

revoke select on table "public"."appointments" from "authenticated";

revoke trigger on table "public"."appointments" from "authenticated";

revoke truncate on table "public"."appointments" from "authenticated";

revoke update on table "public"."appointments" from "authenticated";

revoke delete on table "public"."appointments" from "service_role";

revoke insert on table "public"."appointments" from "service_role";

revoke references on table "public"."appointments" from "service_role";

revoke select on table "public"."appointments" from "service_role";

revoke trigger on table "public"."appointments" from "service_role";

revoke truncate on table "public"."appointments" from "service_role";

revoke update on table "public"."appointments" from "service_role";

revoke delete on table "public"."business_locations" from "anon";

revoke insert on table "public"."business_locations" from "anon";

revoke references on table "public"."business_locations" from "anon";

revoke select on table "public"."business_locations" from "anon";

revoke trigger on table "public"."business_locations" from "anon";

revoke truncate on table "public"."business_locations" from "anon";

revoke update on table "public"."business_locations" from "anon";

revoke delete on table "public"."business_locations" from "authenticated";

revoke insert on table "public"."business_locations" from "authenticated";

revoke references on table "public"."business_locations" from "authenticated";

revoke select on table "public"."business_locations" from "authenticated";

revoke trigger on table "public"."business_locations" from "authenticated";

revoke truncate on table "public"."business_locations" from "authenticated";

revoke update on table "public"."business_locations" from "authenticated";

revoke delete on table "public"."business_locations" from "service_role";

revoke insert on table "public"."business_locations" from "service_role";

revoke references on table "public"."business_locations" from "service_role";

revoke select on table "public"."business_locations" from "service_role";

revoke trigger on table "public"."business_locations" from "service_role";

revoke truncate on table "public"."business_locations" from "service_role";

revoke update on table "public"."business_locations" from "service_role";

revoke delete on table "public"."instructor_availability" from "anon";

revoke insert on table "public"."instructor_availability" from "anon";

revoke references on table "public"."instructor_availability" from "anon";

revoke select on table "public"."instructor_availability" from "anon";

revoke trigger on table "public"."instructor_availability" from "anon";

revoke truncate on table "public"."instructor_availability" from "anon";

revoke update on table "public"."instructor_availability" from "anon";

revoke delete on table "public"."instructor_availability" from "authenticated";

revoke insert on table "public"."instructor_availability" from "authenticated";

revoke references on table "public"."instructor_availability" from "authenticated";

revoke select on table "public"."instructor_availability" from "authenticated";

revoke trigger on table "public"."instructor_availability" from "authenticated";

revoke truncate on table "public"."instructor_availability" from "authenticated";

revoke update on table "public"."instructor_availability" from "authenticated";

revoke delete on table "public"."instructor_availability" from "service_role";

revoke insert on table "public"."instructor_availability" from "service_role";

revoke references on table "public"."instructor_availability" from "service_role";

revoke select on table "public"."instructor_availability" from "service_role";

revoke trigger on table "public"."instructor_availability" from "service_role";

revoke truncate on table "public"."instructor_availability" from "service_role";

revoke update on table "public"."instructor_availability" from "service_role";

revoke delete on table "public"."invitations" from "anon";

revoke insert on table "public"."invitations" from "anon";

revoke references on table "public"."invitations" from "anon";

revoke select on table "public"."invitations" from "anon";

revoke trigger on table "public"."invitations" from "anon";

revoke truncate on table "public"."invitations" from "anon";

revoke update on table "public"."invitations" from "anon";

revoke delete on table "public"."invitations" from "authenticated";

revoke insert on table "public"."invitations" from "authenticated";

revoke references on table "public"."invitations" from "authenticated";

revoke select on table "public"."invitations" from "authenticated";

revoke trigger on table "public"."invitations" from "authenticated";

revoke truncate on table "public"."invitations" from "authenticated";

revoke update on table "public"."invitations" from "authenticated";

revoke delete on table "public"."invitations" from "service_role";

revoke insert on table "public"."invitations" from "service_role";

revoke references on table "public"."invitations" from "service_role";

revoke select on table "public"."invitations" from "service_role";

revoke trigger on table "public"."invitations" from "service_role";

revoke truncate on table "public"."invitations" from "service_role";

revoke update on table "public"."invitations" from "service_role";

revoke delete on table "public"."organization_memberships" from "anon";

revoke insert on table "public"."organization_memberships" from "anon";

revoke references on table "public"."organization_memberships" from "anon";

revoke select on table "public"."organization_memberships" from "anon";

revoke trigger on table "public"."organization_memberships" from "anon";

revoke truncate on table "public"."organization_memberships" from "anon";

revoke update on table "public"."organization_memberships" from "anon";

revoke delete on table "public"."organization_memberships" from "authenticated";

revoke insert on table "public"."organization_memberships" from "authenticated";

revoke references on table "public"."organization_memberships" from "authenticated";

revoke select on table "public"."organization_memberships" from "authenticated";

revoke trigger on table "public"."organization_memberships" from "authenticated";

revoke truncate on table "public"."organization_memberships" from "authenticated";

revoke update on table "public"."organization_memberships" from "authenticated";

revoke delete on table "public"."organization_memberships" from "service_role";

revoke insert on table "public"."organization_memberships" from "service_role";

revoke references on table "public"."organization_memberships" from "service_role";

revoke select on table "public"."organization_memberships" from "service_role";

revoke trigger on table "public"."organization_memberships" from "service_role";

revoke truncate on table "public"."organization_memberships" from "service_role";

revoke update on table "public"."organization_memberships" from "service_role";

revoke delete on table "public"."organizations" from "anon";

revoke insert on table "public"."organizations" from "anon";

revoke references on table "public"."organizations" from "anon";

revoke select on table "public"."organizations" from "anon";

revoke trigger on table "public"."organizations" from "anon";

revoke truncate on table "public"."organizations" from "anon";

revoke update on table "public"."organizations" from "anon";

revoke delete on table "public"."organizations" from "authenticated";

revoke insert on table "public"."organizations" from "authenticated";

revoke references on table "public"."organizations" from "authenticated";

revoke select on table "public"."organizations" from "authenticated";

revoke trigger on table "public"."organizations" from "authenticated";

revoke truncate on table "public"."organizations" from "authenticated";

revoke update on table "public"."organizations" from "authenticated";

revoke delete on table "public"."organizations" from "service_role";

revoke insert on table "public"."organizations" from "service_role";

revoke references on table "public"."organizations" from "service_role";

revoke select on table "public"."organizations" from "service_role";

revoke trigger on table "public"."organizations" from "service_role";

revoke truncate on table "public"."organizations" from "service_role";

revoke update on table "public"."organizations" from "service_role";

revoke delete on table "public"."permissions" from "anon";

revoke insert on table "public"."permissions" from "anon";

revoke references on table "public"."permissions" from "anon";

revoke select on table "public"."permissions" from "anon";

revoke trigger on table "public"."permissions" from "anon";

revoke truncate on table "public"."permissions" from "anon";

revoke update on table "public"."permissions" from "anon";

revoke delete on table "public"."permissions" from "authenticated";

revoke insert on table "public"."permissions" from "authenticated";

revoke references on table "public"."permissions" from "authenticated";

revoke select on table "public"."permissions" from "authenticated";

revoke trigger on table "public"."permissions" from "authenticated";

revoke truncate on table "public"."permissions" from "authenticated";

revoke update on table "public"."permissions" from "authenticated";

revoke delete on table "public"."permissions" from "service_role";

revoke insert on table "public"."permissions" from "service_role";

revoke references on table "public"."permissions" from "service_role";

revoke select on table "public"."permissions" from "service_role";

revoke trigger on table "public"."permissions" from "service_role";

revoke truncate on table "public"."permissions" from "service_role";

revoke update on table "public"."permissions" from "service_role";

revoke delete on table "public"."role_permissions" from "anon";

revoke insert on table "public"."role_permissions" from "anon";

revoke references on table "public"."role_permissions" from "anon";

revoke select on table "public"."role_permissions" from "anon";

revoke trigger on table "public"."role_permissions" from "anon";

revoke truncate on table "public"."role_permissions" from "anon";

revoke update on table "public"."role_permissions" from "anon";

revoke delete on table "public"."role_permissions" from "authenticated";

revoke insert on table "public"."role_permissions" from "authenticated";

revoke references on table "public"."role_permissions" from "authenticated";

revoke select on table "public"."role_permissions" from "authenticated";

revoke trigger on table "public"."role_permissions" from "authenticated";

revoke truncate on table "public"."role_permissions" from "authenticated";

revoke update on table "public"."role_permissions" from "authenticated";

revoke delete on table "public"."role_permissions" from "service_role";

revoke insert on table "public"."role_permissions" from "service_role";

revoke references on table "public"."role_permissions" from "service_role";

revoke select on table "public"."role_permissions" from "service_role";

revoke trigger on table "public"."role_permissions" from "service_role";

revoke truncate on table "public"."role_permissions" from "service_role";

revoke update on table "public"."role_permissions" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

revoke delete on table "public"."webhook_events" from "anon";

revoke insert on table "public"."webhook_events" from "anon";

revoke references on table "public"."webhook_events" from "anon";

revoke select on table "public"."webhook_events" from "anon";

revoke trigger on table "public"."webhook_events" from "anon";

revoke truncate on table "public"."webhook_events" from "anon";

revoke update on table "public"."webhook_events" from "anon";

revoke delete on table "public"."webhook_events" from "authenticated";

revoke insert on table "public"."webhook_events" from "authenticated";

revoke references on table "public"."webhook_events" from "authenticated";

revoke select on table "public"."webhook_events" from "authenticated";

revoke trigger on table "public"."webhook_events" from "authenticated";

revoke truncate on table "public"."webhook_events" from "authenticated";

revoke update on table "public"."webhook_events" from "authenticated";

revoke delete on table "public"."webhook_events" from "service_role";

revoke insert on table "public"."webhook_events" from "service_role";

revoke references on table "public"."webhook_events" from "service_role";

revoke select on table "public"."webhook_events" from "service_role";

revoke trigger on table "public"."webhook_events" from "service_role";

revoke truncate on table "public"."webhook_events" from "service_role";

revoke update on table "public"."webhook_events" from "service_role";


