/*
  Warnings:

  - You are about to drop the column `current_user_id` on the `Application` table. All the data in the column will be lost.
  - Added the required column `mro_user_id` to the `Application` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ri_user_id` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_current_user_id_fkey";

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "current_user_id",
ADD COLUMN     "mro_user_id" INTEGER NOT NULL,
ADD COLUMN     "ri_user_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_ri_user_id_fkey" FOREIGN KEY ("ri_user_id") REFERENCES "RI"("ri_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_mro_user_id_fkey" FOREIGN KEY ("mro_user_id") REFERENCES "MRO"("mro_id") ON DELETE RESTRICT ON UPDATE CASCADE;
