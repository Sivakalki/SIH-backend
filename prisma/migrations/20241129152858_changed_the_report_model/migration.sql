/*
  Warnings:

  - A unique constraint covering the columns `[application_id,handler_id]` on the table `Report` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Report_application_id_handler_id_key" ON "Report"("application_id", "handler_id");
