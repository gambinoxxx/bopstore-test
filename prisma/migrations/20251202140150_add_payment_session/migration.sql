/*
  Warnings:

  - A unique constraint covering the columns `[paymentReference]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentReference" TEXT;

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_id_key" ON "PaymentSession"("id");

-- CreateIndex
CREATE INDEX "PaymentSession_userId_idx" ON "PaymentSession"("userId");

-- CreateIndex
CREATE INDEX "PaymentSession_status_idx" ON "PaymentSession"("status");

-- CreateIndex
CREATE INDEX "PaymentSession_expiresAt_idx" ON "PaymentSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentReference_key" ON "Order"("paymentReference");

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
