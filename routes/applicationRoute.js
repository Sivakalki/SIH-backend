const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../prisma/prisma"); // Import Prisma client
const { log } = require("console");
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
router.post("/application",
  upload.fields([
    { name: "addressProof", maxCount: 1 },
    { name: "dobProof", maxCount: 1 },
    { name: "casteProof", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Extract fields from the request body
      const {
        full_name,
        dob,
        gender,
        religion,
        caste,
        sub_caste,
        parent_religion,
        parent_guardian_type,
        parent_guardian_name,
        marital_status,
        aadhar_num,
        phone_num,
        email,
        addressDetails,
      } = req.body;

      const { pincode, state, district, mandal, address, sachivalayam } = addressDetails;

      // Validate required fields
      if (!full_name || !dob || !gender || !religion || !marital_status || !aadhar_num || !phone_num || !email || !addressDetails) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate address details
      if (!pincode || !state || !district || !mandal) {
        return res.status(400).json({ message: "Incomplete address details" });
      }

      // Create the address record
      const addressRecord = await prisma.address.create({
        data: {
          mandal, state, district, address, pincode, sachivalayam
        }
      });

      // Fetch or validate the caste
      const casteRecord = caste ? await prisma.caste.findUnique({
        where: { caste_type: caste },
        select: { caste_id: true }
      }) : null;

      if (caste && !casteRecord) {
        return res.status(400).json({ message: "Invalid caste provided" });
      }

      // Validate parent guardian type
      const parentGuardianTypeRecord = await prisma.parentGuardianType.findUnique({
        where: { type: parent_guardian_type },
        select: { id: true }
      });

      if (!parentGuardianTypeRecord) {
        return res.status(400).json({ message: "Invalid parent guardian type" });
      }

      // Handle proof files
      const addressProofFile = req.files["addressProof"] ? req.files["addressProof"][0] : null;
      const dobProofFile = req.files["dobProof"] ? req.files["dobProof"][0] : null;
      const casteProofFile = req.files["casteProof"] ? req.files["casteProof"][0] : null;

      const addressProof = addressProofFile ? await prisma.addressProof.create({
        data: {
          typeId: parseInt(addressProofTypeId), // Ensure typeId is provided and valid
          filepath: `/uploads/${addressProofFile.filename}`
        }
      }) : null;

      const dobProof = dobProofFile ? await prisma.dobProof.create({
        data: {
          typeId: dobProofTypeId, // Ensure typeId is valid for DobProofType
          filepath: `/uploads/${dobProofFile.filename}`
        }
      }) : null;

      const casteProof = casteProofFile ? await prisma.casteProof.create({
        data: {
          typeId: casteProofTypeId, // Ensure typeId is valid for CasteProofType
          filepath: `/uploads/${casteProofFile.filename}`
        }
      }) : null;


      if (!addressProofFile || !dobProof || !casteProof) {
        return res.status(400).json({ message: "Address proof file is required" });
      }

      //get the svro
      const svro = await prisma.sVRO.findFirst({
        where: {
          pincode: pincode,
          mandal: mandal,
          sachivalayam: sachivalayam,
        },
        select: {
          svro_id: true,
          user_id: true
        }
      })

      // Step 1: Find the MVRO based on mandal and sachivalayam
      // Fetch all MVROs matching the mandal
      const mvros = await prisma.mVRO.findMany({
        where: {
          mandal: mandal,  // Match the mandal
          type:"PERMANENT"
        },
        select: {
          mvro_id: true,
          user_id: true,
        },
      });

      // Find the MVRO whose sachivalayam matches the given sachivalayam
      const mvro = await Promise.all(
        mvros.map(async (mvro) => {
          const sachivalayam_final = await prisma.sachivalayam.findFirst({
            where: {
              mvro_id: mvro.mvro_id,  // Match the mvro_id
              name: sachivalayam,      // Match the sachivalayam
            },
          });

          // If a sachivalayam is found, return the corresponding mvro
          if (sachivalayam_final) {
            return mvro;
          }
        })
      );

      // Step 2: Check the number of pending applications for the found MVRO
      if (mvro) {
        const pendingApplicationsCount = await prisma.application.count({
          where: {
            mvro_user_id: mvro.user_id,
            status: 'PENDING', // Assuming 'PENDING' is the status for pending applications
          },
        });

        // Step 3: If the pending applications are more than 100, assign to temp mVRO
        if (pendingApplicationsCount > 100) {
          // Find the temp MVRO for the given mandal
          const tempMvro = await prisma.mVRO.findFirst({
            where: {
              mandal: mandal,
              is_temp: true, // Assuming there's an `is_temp` field to distinguish temp MVRO
            },
            select: {
              mvro_id: true,
              user_id: true,
            },
          });

          // Step 4: If a temp MVRO exists, assign the application to the temp MVRO
          if (tempMvro) {
            // You can now assign the application to temp MVRO
            await prisma.application.update({
              where: {
                application_id: applicationId, // Assuming you have the application ID
              },
              data: {
                mvro_user_id: tempMvro.user_id,  // Assign to temp MVRO
              },
            });
          } else {
            console.log("No temp MVRO found for this mandal.");
          }
        } else {
          // If there are no issues, you can proceed as normal with the mvro
          await prisma.application.update({
            where: {
              application_id: applicationId,
            },
            data: {
              mvro_user_id: mvro.user_id, // Assign to normal MVRO
            },
          });
        }
      }
      // Create the application
      const application = await prisma.application.create({
        data: {
          full_name,
          dob: new Date(dob),
          gender,
          religion,
          sub_caste,
          parent_religion,
          parent_guardian_type: { connect: { id: parentGuardianTypeRecord.id } },
          parent_guardian_name,
          marital_status,
          aadhar_num,
          phone_num,
          email,
          current_stage: 3,
          current_user_id: svro ? svro.user_id : null,
          mvro_user_id: mvro ? mvro.mvro_id : null,
          svro_user_id: svro ? svro.svro_id : null,
          address_id: addressRecord.address_id,
          caste_id: casteRecord ? casteRecord.caste_id : null,
          addressProof_id: addressProof ? addressProof.id : null,
          dobProof_id: dobProof ? dobProof.id : null,
          casteProof_id: casteProof ? casteProof.id : null,
          status: "PENDING",
          created_at: new Date()
        }
      });

      return res.status(201).json({
        message: "Application created successfully",
        application
      });
    } catch (error) {
      console.error("Error creating application:", error);
      return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
  });

router.get("/particular_application/:app_id", async (req, res) => {
  try {
    const particular_application = prisma.application.findFirst({
      where: {
        application_id: req.params.app_id
      },
      include: {

      }
    })
  }
  catch (e) {
    console.log(e);
    return res.status(400).json({ "message": "There is an error" })
  }
})

router.put("/edit_application/:app_id", async (req, res) => {
    try {
        const app_id = req.params.app_id;
        const { field1, field2, ...otherFields } = req.body; // Fields to be updated
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(400).json({ message: "Token is expired or invalid" });
        }

        const user = await prisma.user.findUnique({
            where: { email: decoded.email }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const application = await prisma.application.findFirst({
            where: {
                application_id: app_id,
                applicant_id: user.id
            }
        });

        if (!application) {
            return res.status(404).json({ message: "Application not found or you don't have access" });
        }

        // Update the application
        const updatedApplication = await prisma.application.update({
            where: { application_id: app_id },
            data: { field1, field2, ...otherFields }
        });

        return res.status(200).json({
            message: "Application updated successfully",
            updatedApplication
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
});



router.get("/getAllLocationDetails", async (req, res) => {
  try {
    const vroDetails = await prisma.sVRO.findMany({
      select: {
        pincode: true,
        state: true,
        district: true,
        mandal: true,
        sachivalayam: true,
      },
    });

    if (vroDetails.length === 0) {
      return res.status(400).json({ message: "No location data found" });
    }
    return res.status(200).json(vroDetails);
  } catch (error) {
    console.error("Error fetching location details:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



// router.get('/getVroApplication', async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ "message": "No token provided" });
//     }

//     // Extract the token
//     const token = authHeader.split(" ")[1];

//     // Decode and verify the token
//     const decoded = verifyToken(token);

//     if (!decoded) {
//       return res.status(400).json({ "message": "Token is expired or invalid" });
//     }
//     const id = decoded.id
//     const vro = prisma.vRO.findFirst({
//       where: {
//         id: decoded.id
//       }
//     })
//     const applications = prisma.application.findMany({
//       where: {
//         id: id
//       }
//     })
//     if (!applications) {
//       return res.status(200).json({ "message": "There are no applicaitons" })
//     }
//     return res.status()
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// })

module.exports = router;
