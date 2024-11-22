/*
  Warnings:

  - Added the required column `mandal` to the `MRO` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MRO" ADD COLUMN     "mandal" TEXT NOT NULL;
