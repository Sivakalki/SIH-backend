/*
  Warnings:

  - A unique constraint covering the columns `[application_id]` on the table `ReCheck` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ReCheck_application_id_key" ON "ReCheck"("application_id");
