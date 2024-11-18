/*
  Warnings:

  - Added the required column `pincode` to the `VRO` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_addressProofId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_casteProofId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_dobProofId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_districtId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_mroId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_vroId_fkey";

-- AlterTable
ALTER TABLE "VRO" ADD COLUMN     "pincode" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mroId_fkey" FOREIGN KEY ("mroId") REFERENCES "MRO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vroId_fkey" FOREIGN KEY ("vroId") REFERENCES "VRO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_addressProofId_fkey" FOREIGN KEY ("addressProofId") REFERENCES "AddressProof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_dobProofId_fkey" FOREIGN KEY ("dobProofId") REFERENCES "DobProof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_casteProofId_fkey" FOREIGN KEY ("casteProofId") REFERENCES "CasteProof"("id") ON DELETE CASCADE ON UPDATE CASCADE;
