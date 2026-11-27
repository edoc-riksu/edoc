-- Plan Day 52: invite gate for the closed test.

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "inviteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invites_codeHash_key" ON "invites"("codeHash");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "invites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
