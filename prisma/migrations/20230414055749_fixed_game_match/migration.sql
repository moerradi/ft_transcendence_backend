/*
  Warnings:

  - You are about to drop the column `finished_at` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Match` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Match" DROP COLUMN "finished_at",
DROP COLUMN "status",
ALTER COLUMN "started_at" SET DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "MatchStatus";
