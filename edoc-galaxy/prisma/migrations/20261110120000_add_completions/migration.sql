-- CreateTable
CREATE TABLE "completions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "encounterCount" INTEGER NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "firstTryCount" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL,
    "elapsedMs" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "completions_userId_moduleSlug_key" ON "completions"("userId", "moduleSlug");

-- AddForeignKey
ALTER TABLE "completions" ADD CONSTRAINT "completions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

