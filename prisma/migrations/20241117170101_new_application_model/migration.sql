/*
  Warnings:

  - A unique constraint covering the columns `[aadharID]` on the table `Application` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "STATUS" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "status" "STATUS" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Application_aadharID_key" ON "Application"("aadharID");
