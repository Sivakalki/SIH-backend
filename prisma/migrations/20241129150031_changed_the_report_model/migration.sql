/*
  Warnings:

  - You are about to drop the column `level` on the `Report` table. All the data in the column will be lost.
  - Added the required column `level_id` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Report` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "level",
ADD COLUMN     "level_id" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "STATUS" NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "Role"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;
