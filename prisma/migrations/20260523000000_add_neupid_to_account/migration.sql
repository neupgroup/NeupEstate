-- AlterTable
ALTER TABLE "account" ADD COLUMN     "neupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "account_neupId_key" ON "account"("neupId");
