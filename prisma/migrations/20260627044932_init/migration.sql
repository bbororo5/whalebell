-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "coinSymbol" TEXT NOT NULL,
    "thresholdId" TEXT NOT NULL,
    "thresholdKrw" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "coinSymbol" TEXT NOT NULL,
    "fiatKrw" DOUBLE PRECISION NOT NULL,
    "tokenAmount" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "impactLevel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "shortBody" TEXT NOT NULL,
    "delivery" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_phone_idx" ON "Subscription"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_phone_coinSymbol_key" ON "Subscription"("phone", "coinSymbol");

-- CreateIndex
CREATE INDEX "Alert_phone_idx" ON "Alert"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_transferId_subscriptionId_key" ON "Alert"("transferId", "subscriptionId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
