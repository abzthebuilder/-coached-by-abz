-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('BUILTIN', 'OFF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS');

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "fromDiary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "source" "FoodSource" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "barcode" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "kcal" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "servingG" DOUBLE PRECISION,
    "servingLabel" TEXT NOT NULL DEFAULT '',
    "ownerClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "meal" "MealSlot" NOT NULL,
    "foodId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "kcal" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Food_source_barcode_idx" ON "Food"("source", "barcode");

-- CreateIndex
CREATE INDEX "Food_ownerClientId_idx" ON "Food"("ownerClientId");

-- CreateIndex
CREATE INDEX "FoodEntry_clientId_day_idx" ON "FoodEntry"("clientId", "day");

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_ownerClientId_fkey" FOREIGN KEY ("ownerClientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
