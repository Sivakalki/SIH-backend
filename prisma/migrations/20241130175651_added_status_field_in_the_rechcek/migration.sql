/*
  Warnings:

  - Added the required column `status` to the `ReCheck` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ReCheck" ADD COLUMN     "status" "STATUS" NOT NULL;
