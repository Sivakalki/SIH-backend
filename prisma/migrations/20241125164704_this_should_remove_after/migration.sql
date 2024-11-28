-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_addressProof_id_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_casteProof_id_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_dobProof_id_fkey";

-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "addressProof_id" DROP NOT NULL,
ALTER COLUMN "casteProof_id" DROP NOT NULL,
ALTER COLUMN "dobProof_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_addressProof_id_fkey" FOREIGN KEY ("addressProof_id") REFERENCES "AddressProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_casteProof_id_fkey" FOREIGN KEY ("casteProof_id") REFERENCES "CasteProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_dobProof_id_fkey" FOREIGN KEY ("dobProof_id") REFERENCES "DobProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;
