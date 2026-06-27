-- 휴대폰 번호 평문(phone) → 해시(phoneHash) + 암호문(phoneEnc)으로 교체
-- 데모 데이터만 있던 테이블이므로 기존 행은 비운 뒤 컬럼을 교체한다.

-- DropIndex
DROP INDEX "Subscription_phone_idx";
DROP INDEX "Subscription_phone_coinSymbol_key";
DROP INDEX "Alert_phone_idx";

-- AlterTable: Subscription
ALTER TABLE "Subscription" DROP COLUMN "phone";
ALTER TABLE "Subscription" ADD COLUMN "phoneHash" TEXT NOT NULL;
ALTER TABLE "Subscription" ADD COLUMN "phoneEnc" TEXT NOT NULL;

-- AlterTable: Alert
ALTER TABLE "Alert" DROP COLUMN "phone";
ALTER TABLE "Alert" ADD COLUMN "phoneHash" TEXT NOT NULL;
ALTER TABLE "Alert" ADD COLUMN "phoneEnc" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Subscription_phoneHash_idx" ON "Subscription"("phoneHash");
CREATE UNIQUE INDEX "Subscription_phoneHash_coinSymbol_key" ON "Subscription"("phoneHash", "coinSymbol");
CREATE INDEX "Alert_phoneHash_idx" ON "Alert"("phoneHash");
