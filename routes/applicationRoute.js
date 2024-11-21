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
    const { pincode, state, village, district, mandal } = addressDetails;

    if (!pincode || !state || !village || !district || !mandal) {
      return res.status(400).json({ message: "Incomplete address details" });
    }

    console.log(pincode, state, village, mandal, district)

    const vro = await prisma.vRO.findFirst({
      where: { pincode, state, village, district, mandal },
      select: { id: true },
    });

    if (!vro) {
      return res.status(404).json({ message: "No VRO found for the provided address details" });
    }

    // Save address details in the Address table
    const address = await prisma.address.create({
      data: { village, mandal, pincode, address: addressDetails.address, state, district },
    });

    // Save proof files and find the corresponding type IDs
    const addressProofFile = req.files["addressProof"] ? req.files["addressProof"][0] : null;
    const dobProofFile = req.files["dobProof"] ? req.files["dobProof"][0] : null;
    const casteProofFile = req.files["casteProof"] ? req.files["casteProof"][0] : null;

    const addressProofType = req.body.addressProofType.toUpperCase();
    const dobProofType = req.body.dobProofType.toUpperCase();
    const casteProofType = req.body.casteProofType.toUpperCase();

    // Fetch the type IDs
    const addressProofTypeId = await prisma.addressProofType.findUnique({
      where: { type: addressProofType },
      select: { id: true },
    });

    const dobProofTypeId = await prisma.dobProofType.findUnique({
      where: { type: dobProofType },
      select: { id: true },
    });

    const casteProofTypeId = await prisma.casteProofType.findUnique({
      where: { type: casteProofType },
      select: { id: true },
    });

    console.log(caste, " is teh caste")
    const caste2 = caste ? await prisma.caste.findUnique({
      where: {
        type: caste
      },
      select: {
        id: true
      }
    }) : null;

    console.log(casteProofTypeId, dobProofTypeId, addressProofTypeId, caste2, " are the id's")

    if (!addressProofTypeId || !dobProofTypeId || !casteProofTypeId) {
      return res.status(400).json({ message: "Invalid proof type provided" });
    }

    // Upsert for addressProof
    const addressProof = addressProofFile ? await prisma.addressProof.upsert({
      where: {
        typeId: addressProofTypeId.id,  // Use the type ID to check if the record exists
      },
      update: {
        file: `/uploads/${addressProofFile.filename}`,  // Update file if it exists
      },
      create: {
        typeId: addressProofTypeId.id,  // Create with the appropriate type ID
        file: `/uploads/${addressProofFile.filename}`,  // Set the file path
      },
    }) : null;

    // Upsert for dobProof
    const dobProof = dobProofFile ? await prisma.dobProof.upsert({
      where: {
        typeId: dobProofTypeId.id,  // Use the type ID to check if the record exists
      },
      update: {
        file: `/uploads/${dobProofFile.filename}`,  // Update file if it exists
      },
      create: {
        typeId: dobProofTypeId.id,  // Create with the appropriate type ID
        file: `/uploads/${dobProofFile.filename}`,  // Set the file path
      },
    }) : null;

    // Upsert for casteProof
    const casteProof = casteProofFile ? await prisma.casteProof.upsert({
      where: {
        typeId: casteProofTypeId.id,  // Use the type ID to check if the record exists
      },
      update: {
        file: `/uploads/${casteProofFile.filename}`,  // Update file if it exists
      },
      create: {
        typeId: casteProofTypeId.id,  // Create with the appropriate type ID
        file: `/uploads/${casteProofFile.filename}`,  // Set the file path
      },
    }) : null;

    console.log(casteProof, dobProof, addressProof, " are the id's")

    // Save the application along with the foreign keys to the proof files and address
    const application = await prisma.application.create({
      data: {
        firstname,
        lastname,
        email,
        phone,
        aadharID,
        vroId: vro.id,  // connecting to VRO
        caste: caste2 ? {
          connect: { id: caste2.id }  // ensure caste is connected properly
        } : undefined,
        dobProof: dobProof ? { connect: { id: dobProof.id } } : undefined,
        casteProof: casteProof ? { connect: { id: casteProof.id } } : undefined,
        addressProof: addressProof ? { connect: { id: addressProof.id } } : undefined,
        status: "PENDING",
        applicationDate: new Date(),
      },
    });


    return res.status(200).json({ message: "Application created successfully", application });
  } catch (error) {
    console.error("Error creating application:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/getAllLocationDetails", async (req, res) => {
  try {
    const vroDetails = await prisma.vRO.findMany({
      select: {
        pincode: true,
        state: true,
        district: true,
        mandal: true,
        village: true,
      },
    });

    if (vroDetails.length === 0) {
      return res.status(404).json({ message: "No location data found" });
    }
    return res.status(200).json(vroDetails);
  } catch (error) {
    console.error("Error fetching location details:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



router.get('/getVroApplication', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ "message": "No token provided" });
    }

    // Extract the token
    const token = authHeader.split(" ")[1];

    // Decode and verify the token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(400).json({ "message": "Token is expired or invalid" });
    }
    const id = decoded.id
    const vro = prisma.vRO.findFirst({
      where: {
        id: decoded.id
      }
    })
    const applications = prisma.application.findMany({
      where: {
        id: id
      }
    })
    if (!applications) {
      return res.status(200).json({ "message": "There are no applicaitons" })
    }
    return res.status()
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
})

module.exports = router;
