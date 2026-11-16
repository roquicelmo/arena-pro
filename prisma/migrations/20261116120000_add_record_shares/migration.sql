-- CreateTable
CREATE TABLE "AthleteShare" (
    "athleteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteShare_pkey" PRIMARY KEY ("athleteId","userId")
);

-- CreateTable
CREATE TABLE "ArenaShare" (
    "arenaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaShare_pkey" PRIMARY KEY ("arenaId","userId")
);

-- CreateIndex
CREATE INDEX "AthleteShare_userId_idx" ON "AthleteShare"("userId");

-- CreateIndex
CREATE INDEX "ArenaShare_userId_idx" ON "ArenaShare"("userId");

-- AddForeignKey
ALTER TABLE "AthleteShare" ADD CONSTRAINT "AthleteShare_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteShare" ADD CONSTRAINT "AthleteShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaShare" ADD CONSTRAINT "ArenaShare_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaShare" ADD CONSTRAINT "ArenaShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

