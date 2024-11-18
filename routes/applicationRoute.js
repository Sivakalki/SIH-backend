const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../prisma/prisma"); // Import Prisma client
const router = express.Router();

// Set up file storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Specify the directory where files will be stored
    cb(null, "uploads/"); // Ensure this folder exists or create it
  },
  filename: (req, file, cb) => {
    // Generate unique filenames using timestamp and original extension
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST route to save the application and related files
router.post("/application", upload.fields([
  { name: "addressProof", maxCount: 1 },
  { name: "dobProof", maxCount: 1 },
  { name: "casteProof", maxCount: 1 }
]), async (req, res) => {
  try {
    // Extract data from request
    const { firstname, lastname, email, phone, aadharID, caste, addressDetails } = req.body;

    // Save address details (if provided) in the Address table
    const address = await prisma.address.create({
      data: {
        village: addressDetails.village,
        mandal: addressDetails.mandal,
        pincode: addressDetails.pincode,
        address: addressDetails.address,
        state: addressDetails.state,
        district: addressDetails.district
      }
    });

    // Save proof files for Address, DOB, and Caste
    const addressProofFile = req.files["addressProof"] ? req.files["addressProof"][0] : null;
    const dobProofFile = req.files["dobProof"] ? req.files["dobProof"][0] : null;
    const casteProofFile = req.files["casteProof"] ? req.files["casteProof"][0] : null;

    const addressProof = addressProofFile ? await prisma.addressProof.create({
      data: {
        type: req.body.addressProofType.toUpperCase(),  // e.g., "AADHAAR", "GAS"
        file: `/uploads/${addressProofFile.filename}`
      }
    }) : null;

    const dobProof = dobProofFile ? await prisma.dobProof.create({
      data: {
        type: req.body.dobProofType.toUpperCase(),  // e.g., "PAN", "SSC"
        file: `/uploads/${dobProofFile.filename}`
      }
    }) : null;

    const casteProof = casteProofFile ? await prisma.casteProof.create({
      data: {
        type: req.body.casteProofType.toUpperCase(),  // e.g., "FATHER", "MOTHER"
        file: `/uploads/${casteProofFile.filename}`
      }
    }) : null;

    // Save the application along with the foreign keys to the proof files and address
    const application = await prisma.application.create({
      data: {
        firstname,
        lastname,
        email,
        phone,
        aadharID,
        caste: caste.toUpperCase() || "GENERAL", // Default to "GENERAL"
        // addressProofId: addressProof ? addressProof.id : null,
        // dobProofId: dobProof ? dobProof.id : null,
        // casteProofId: casteProof ? casteProof.id : null,
        addressProof: addressProof ? { connect: { id: addressProof.id } } : undefined,
        dobProof: dobProof ? { connect: { id: dobProof.id } } : undefined,
        casteProof: casteProof ? { connect: { id: casteProof.id } } : undefined,
        status: "PENDING",
        applicationDate: new Date()
      }
    });

    return res.status(200).json({ message: "Application created successfully", application });
  } catch (error) {
    console.error("Error creating application:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});


router.get("/getAddressDetails", async (req, res) => {
  const {pincode} = req.pincode
  if(!pincode){
    return res.status(404).json({"message":"enter the valid pincode"})
  }
  try{
    const vroDetails = await prisma.vRO.findMany({
      where:{
        pincode:pincode
      },
      select:{
        pincode: true,
        state: true,
        district: true,
        village: true,
      }
    })
    if(vroDetails.length() === 0){
      return res.status(400).json({"message":"There is no user data"})
    }
  }
  catch(e){
    
  }
})

router.get("/getAllPincodes", async (req, res) => {
  try {
    // Fetch all unique pincodes from the VRO table
    const vroDetails = await prisma.vRO.findMany({
      select: {
        pincode: true, // Only select the pincode field
      },
      distinct: ["pincode"], // Ensure uniqueness
    });

    // If no pincodes are found
    if (vroDetails.length === 0) {
      return res.status(404).json({ message: "No pincodes found" });
    }

    // Extract the pincode values from the result
    const pincodes = vroDetails.map(vro => vro.pincode);

    // Return the list of pincodes
    return res.status(200).json({ pincodes });
  } catch (error) {
    console.error("Error fetching pincodes:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
})
module.exports = router;
