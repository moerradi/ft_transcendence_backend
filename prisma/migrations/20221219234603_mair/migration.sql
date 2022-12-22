/*
  Warnings:

  - Changed the type of `intra_id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "intra_id",
ADD COLUMN     "intra_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_intra_id_key" ON "User"("intra_id");
