/*
  Warnings:

  - Added the required column `player_one_exp` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `player_two_exp` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "player_one_exp" INTEGER NOT NULL,
ADD COLUMN     "player_two_exp" INTEGER NOT NULL;
