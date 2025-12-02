-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHotDeal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specifications" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);
