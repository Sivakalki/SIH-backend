-- CreateEnum
CREATE TYPE "STATUS" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GENDER" AS ENUM ('MALE', 'FEMALE', 'TRANSGENDER');

-- CreateEnum
CREATE TYPE "MARITAL" AS ENUM ('SINGLE', 'MARRIED');

-- CreateEnum
CREATE TYPE "MVROTYPE" AS ENUM ('PERMENANT', 'TEMPORARY');

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Role" (
    "role_id" SERIAL NOT NULL,
    "role_type" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "Address" (
    "address_id" SERIAL NOT NULL,
    "pincode" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "sachivalayam" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "Caste" (
    "caste_id" SERIAL NOT NULL,
    "caste_type" TEXT NOT NULL,

    CONSTRAINT "Caste_pkey" PRIMARY KEY ("caste_id")
);

-- CreateTable
CREATE TABLE "Application" (
    "application_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "GENDER" NOT NULL,
    "religion" TEXT NOT NULL,
    "caste_id" INTEGER NOT NULL,
    "sub_caste" TEXT NOT NULL,
    "parent_religion" TEXT NOT NULL,
    "parent_guardian_id" INTEGER NOT NULL,
    "parent_guardian_name" TEXT NOT NULL,
    "address_id" INTEGER NOT NULL,
    "addressProof_id" INTEGER NOT NULL,
    "casteProof_id" INTEGER NOT NULL,
    "dobProof_id" INTEGER NOT NULL,
    "marital_status" "MARITAL" NOT NULL,
    "aadhar_num" TEXT NOT NULL,
    "phone_num" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "STATUS" NOT NULL,
    "current_user_id" INTEGER,
    "mvro_user_id" INTEGER NOT NULL,
    "svro_user_id" INTEGER NOT NULL,
    "current_stage_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "rejection_reason" TEXT,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "Report" (
    "report_id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "handler_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "created_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "caste_id" INTEGER NOT NULL,
    "validity" TIMESTAMP(3) NOT NULL,
    "file_path" TEXT NOT NULL,
    "application_id" INTEGER NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SVRO" (
    "svro_id" SERIAL NOT NULL,
    "pincode" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "sachivalayam" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "SVRO_pkey" PRIMARY KEY ("svro_id")
);

-- CreateTable
CREATE TABLE "MVRO" (
    "mvro_id" SERIAL NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "type" "MVROTYPE" NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "MVRO_pkey" PRIMARY KEY ("mvro_id")
);

-- CreateTable
CREATE TABLE "Sachivalayam" (
    "sachivalayam_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mvro_id" INTEGER NOT NULL,

    CONSTRAINT "Sachivalayam_pkey" PRIMARY KEY ("sachivalayam_id")
);

-- CreateTable
CREATE TABLE "RI" (
    "ri_id" SERIAL NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "RI_pkey" PRIMARY KEY ("ri_id")
);

-- CreateTable
CREATE TABLE "MRO" (
    "mro_id" SERIAL NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "MRO_pkey" PRIMARY KEY ("mro_id")
);

-- CreateTable
CREATE TABLE "AddressProofType" (
    "id" SERIAL NOT NULL,
    "addressProofType" TEXT NOT NULL,

    CONSTRAINT "AddressProofType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressProof" (
    "id" SERIAL NOT NULL,
    "typeId" INTEGER NOT NULL,
    "filepath" TEXT NOT NULL,

    CONSTRAINT "AddressProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DobProofType" (
    "id" SERIAL NOT NULL,
    "dobProofType" TEXT NOT NULL,

    CONSTRAINT "DobProofType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DobProof" (
    "id" SERIAL NOT NULL,
    "typeId" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,

    CONSTRAINT "DobProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasteProofType" (
    "id" SERIAL NOT NULL,
    "casteProofType" TEXT NOT NULL,

    CONSTRAINT "CasteProofType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasteProof" (
    "id" SERIAL NOT NULL,
    "typeId" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,

    CONSTRAINT "CasteProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentGuardianType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "ParentGuardianType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_role_type_key" ON "Role"("role_type");

-- CreateIndex
CREATE UNIQUE INDEX "Caste_caste_type_key" ON "Caste"("caste_type");

-- CreateIndex
CREATE UNIQUE INDEX "Application_address_id_key" ON "Application"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "Application_addressProof_id_key" ON "Application"("addressProof_id");

-- CreateIndex
CREATE UNIQUE INDEX "Application_casteProof_id_key" ON "Application"("casteProof_id");

-- CreateIndex
CREATE UNIQUE INDEX "Application_dobProof_id_key" ON "Application"("dobProof_id");

-- CreateIndex
CREATE UNIQUE INDEX "Application_aadhar_num_key" ON "Application"("aadhar_num");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_application_id_key" ON "Certificate"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "SVRO_user_id_key" ON "SVRO"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MVRO_user_id_key" ON "MVRO"("user_id");

-- CreateIndex
CREATE INDEX "Sachivalayam_mvro_id_index" ON "Sachivalayam"("mvro_id");

-- CreateIndex
CREATE UNIQUE INDEX "RI_user_id_key" ON "RI"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MRO_user_id_key" ON "MRO"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AddressProofType_addressProofType_key" ON "AddressProofType"("addressProofType");

-- CreateIndex
CREATE INDEX "AddressProof_typeId_index" ON "AddressProof"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "DobProofType_dobProofType_key" ON "DobProofType"("dobProofType");

-- CreateIndex
CREATE INDEX "DobProof_typeId_index" ON "DobProof"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "CasteProofType_casteProofType_key" ON "CasteProofType"("casteProofType");

-- CreateIndex
CREATE UNIQUE INDEX "CasteProof_typeId_key" ON "CasteProof"("typeId");

-- CreateIndex
CREATE INDEX "CasteProof_typeId_index" ON "CasteProof"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentGuardianType_type_key" ON "ParentGuardianType"("type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_caste_id_fkey" FOREIGN KEY ("caste_id") REFERENCES "Caste"("caste_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_parent_guardian_id_fkey" FOREIGN KEY ("parent_guardian_id") REFERENCES "ParentGuardianType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "Address"("address_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_addressProof_id_fkey" FOREIGN KEY ("addressProof_id") REFERENCES "AddressProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_casteProof_id_fkey" FOREIGN KEY ("casteProof_id") REFERENCES "CasteProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_dobProof_id_fkey" FOREIGN KEY ("dobProof_id") REFERENCES "DobProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_current_user_id_fkey" FOREIGN KEY ("current_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_mvro_user_id_fkey" FOREIGN KEY ("mvro_user_id") REFERENCES "MVRO"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_svro_user_id_fkey" FOREIGN KEY ("svro_user_id") REFERENCES "SVRO"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "Role"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "Application"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SVRO" ADD CONSTRAINT "SVRO_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MVRO" ADD CONSTRAINT "MVRO_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sachivalayam" ADD CONSTRAINT "Sachivalayam_mvro_id_fkey" FOREIGN KEY ("mvro_id") REFERENCES "MVRO"("mvro_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RI" ADD CONSTRAINT "RI_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MRO" ADD CONSTRAINT "MRO_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressProof" ADD CONSTRAINT "AddressProof_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AddressProofType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DobProof" ADD CONSTRAINT "DobProof_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DobProofType"("dobProofType") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasteProof" ADD CONSTRAINT "CasteProof_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "CasteProofType"("casteProofType") ON DELETE RESTRICT ON UPDATE CASCADE;
