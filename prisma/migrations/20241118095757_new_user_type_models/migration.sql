-- AlterTable
ALTER TABLE "User" ADD COLUMN     "districtId" INTEGER,
ADD COLUMN     "mroId" INTEGER,
ADD COLUMN     "vroId" INTEGER;

-- CreateTable
CREATE TABLE "District" (
    "id" SERIAL NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MRO" (
    "id" SERIAL NOT NULL,
    "mandal" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "MRO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VRO" (
    "id" SERIAL NOT NULL,
    "village" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "VRO_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mroId_fkey" FOREIGN KEY ("mroId") REFERENCES "MRO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vroId_fkey" FOREIGN KEY ("vroId") REFERENCES "VRO"("id") ON DELETE SET NULL ON UPDATE CASCADE;
