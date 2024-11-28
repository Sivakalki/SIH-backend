/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Sachivalayam` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Sachivalayam_name_key" ON "Sachivalayam"("name");
