-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "organization_memberships" ADD COLUMN     "removed_at" TIMESTAMP(3),
ADD COLUMN     "removed_by" TEXT;
