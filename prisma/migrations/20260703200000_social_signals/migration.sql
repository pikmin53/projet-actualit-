-- AlterTable
ALTER TABLE "EventCluster" ADD COLUMN "socialConfirmations" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SocialSignal" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "community" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "externalUrl" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedClusterId" TEXT,

    CONSTRAINT "SocialSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialSignal_url_key" ON "SocialSignal"("url");

-- CreateIndex
CREATE INDEX "SocialSignal_expiresAt_idx" ON "SocialSignal"("expiresAt");

-- CreateIndex
CREATE INDEX "SocialSignal_confirmedClusterId_idx" ON "SocialSignal"("confirmedClusterId");
