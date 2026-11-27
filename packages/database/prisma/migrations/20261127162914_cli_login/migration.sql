-- CreateEnum
CREATE TYPE "CliLoginStatus" AS ENUM ('pending', 'approved', 'denied', 'used');

-- CreateTable
CREATE TABLE "CliLogin" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "status" "CliLoginStatus" NOT NULL DEFAULT 'pending',
    "workspaceId" UUID,
    "approvedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CliLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CliLogin_expiresAt_idx" ON "CliLogin"("expiresAt");

-- AddForeignKey
ALTER TABLE "CliLogin" ADD CONSTRAINT "CliLogin_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
