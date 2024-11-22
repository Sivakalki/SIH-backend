/*
  Warnings:

  - The values [PERMENANT] on the enum `MVROTYPE` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `applied_by_id` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MVROTYPE_new" AS ENUM ('PERMANENT', 'TEMPORARY');
ALTER TABLE "MVRO" ALTER COLUMN "type" TYPE "MVROTYPE_new" USING ("type"::text::"MVROTYPE_new");
ALTER TYPE "MVROTYPE" RENAME TO "MVROTYPE_old";
ALTER TYPE "MVROTYPE_new" RENAME TO "MVROTYPE";
DROP TYPE "MVROTYPE_old";
COMMIT;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "applied_by_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "ReCheck" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "application_id" INTEGER NOT NULL,

    CONSTRAINT "ReCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReCheck" ADD CONSTRAINT "ReCheck_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;
