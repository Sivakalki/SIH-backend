-- CreateEnum
CREATE TYPE "ADDRESSPROOF" AS ENUM ('AADHAAR', 'GAS', 'ELECTRICITY', 'WATER');

-- CreateEnum
CREATE TYPE "DOBPROOF" AS ENUM ('PAN', 'SSC');

-- CreateEnum
CREATE TYPE "CASTEPROOF" AS ENUM ('FATHER', 'MOTHER', 'SIBLING');

-- CreateEnum
CREATE TYPE "CASTE" AS ENUM ('OC', 'SC', 'OBC', 'ST', 'OC_EWS', 'GENERAL');

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aadharID" TEXT NOT NULL,
    "caste" "CASTE" NOT NULL DEFAULT 'GENERAL',
    "addressProofId" INTEGER NOT NULL,
    "dobProofId" INTEGER NOT NULL,
    "casteProofId" INTEGER NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressProof" (
    "id" SERIAL NOT NULL,
    "type" "ADDRESSPROOF" NOT NULL,
    "file" TEXT NOT NULL,

    CONSTRAINT "AddressProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DobProof" (
    "id" SERIAL NOT NULL,
    "type" "DOBPROOF" NOT NULL,
    "file" TEXT NOT NULL,

    CONSTRAINT "DobProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasteProof" (
    "id" SERIAL NOT NULL,
    "type" "CASTEPROOF" NOT NULL,
    "file" TEXT NOT NULL,

    CONSTRAINT "CasteProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" SERIAL NOT NULL,
    "village" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_email_key" ON "Application"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Application_addressProofId_key" ON "Application"("addressProofId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_dobProofId_key" ON "Application"("dobProofId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_casteProofId_key" ON "Application"("casteProofId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_addressProofId_fkey" FOREIGN KEY ("addressProofId") REFERENCES "AddressProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_dobProofId_fkey" FOREIGN KEY ("dobProofId") REFERENCES "DobProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_casteProofId_fkey" FOREIGN KEY ("casteProofId") REFERENCES "CasteProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
