const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../prisma/prisma"); // Import Prisma client
const { log } = require("console");
const { getUserFromToken } = require("../utils/findUser");
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
  // upload.fields([
  //   { name: "addressProof", maxCount: 1 },
  //   { name: "dobProof", maxCount: 1 },
  //   { name: "casteProof", maxCount: 1 }
  // ]),
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

      const aadhar_check = await prisma.application.findFirst({
        where:{
          aadhar_num : aadhar_num
        },
      })
      if(aadhar_check){
        return res.status(400).json({"Message":"Applicant with this aadhar num is already created"})
      }

      // Handle proof files
      // const addressProofFile = req.files["addressProof"] ? req.files["addressProof"][0] : null;
      // const dobProofFile = req.files["dobProof"] ? req.files["dobProof"][0] : null;
      // const casteProofFile = req.files["casteProof"] ? req.files["casteProof"][0] : null;

      // const addressProof = addressProofFile ? await prisma.addressProof.create({
      //   data: {
      //     typeId: parseInt(addressProofTypeId), // Ensure typeId is provided and valid
      //     filepath: `/uploads/${addressProofFile.filename}`
      //   }
      // }) : null;

      // const dobProof = dobProofFile ? await prisma.dobProof.create({
      //   data: {
      //     typeId: dobProofTypeId, // Ensure typeId is valid for DobProofType
      //     filepath: `/uploads/${dobProofFile.filename}`
      //   }
      // }) : null;

      // const casteProof = casteProofFile ? await prisma.casteProof.create({
      //   data: {
      //     typeId: casteProofTypeId, // Ensure typeId is valid for CasteProofType
      //     filepath: `/uploads/${casteProofFile.filename}`
      //   }
      // }) : null;


      // if (!addressProofFile || !dobProof || !casteProof) {
      //   return res.status(400).json({ message: "Address proof file is required" });
      // }

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
          type: "PERMANENT"
        },
        select: {
          mvro_id: true,
          user_id: true,
        },
      });
      // Step 1: Find the RI based on mandal and sachivalayam
      // Fetch all RIs matching the mandal
      const ri = await prisma.rI.findMany({
        where: {
          mandal: mandal,  // Match the mandal
        },
        select: {
          ri_id: true,
          user_id: true,
        },
      });
      // Step 1: Find the MRO based on mandal and sachivalayam
      // Fetch all MROs matching the mandal
      const mro = await prisma.mRO.findMany({
        where: {
          mandal: mandal,  // Match the mandal
        },
        select: {
          mro_id: true,
          user_id: true,
        },
      });

      const current_user = getUserFromToken(req.headers.authorization)

      let mvroId = null;

      // Step 1: Find the matching MVRO
      for (const mvro of mvros) {
        const sachivalayam_final = await prisma.sachivalayam.findFirst({
          where: {
            mvro_id: mvro.mvro_id,  // Match the mvro_id
            name: sachivalayam,     // Match the sachivalayam
          },
        });

        if (sachivalayam_final) {
          mvroId = mvro.mvro_id; // Directly store the matching mvro_id
          break; // Exit the loop once a match is found
        }
      }

      // Step 2: Check the number of pending applications for the found MVRO
      if (mvroId) {
        const pendingApplicationsCount = await prisma.application.count({
          where: {
            mvro_user_id: mvroId,
            status: 'PENDING', // Assuming 'PENDING' is the status for pending applications
          },
        });

        // Step 3: If the pending applications are more than 100, assign to temp MVRO
        if (pendingApplicationsCount > 100) {
          // Find the temp MVRO for the given mandal
          const tempMvro = await prisma.mVRO.findFirst({
            where: {
              mandal: mandal,
              type: "TEMPORARY", // Assuming there's an is_temp field to distinguish temp MVRO
            },
            select: {
              mvro_id: true,
            },
          });

          if (tempMvro) {
            mvroId = tempMvro.mvro_id; // Update mvroId to temp MVRO
          } else {
            console.log("No temp MVRO found for this mandal.");
          }
        }
      } else {
        console.log("No matching MVRO found.");
      }

      const mvroUserId = await prisma.mVRO.findFirst({
        where: {
          mvro_id: mvroId,
        },
        select: {
          user_id: true,
        }
      })
      const current_stage = await prisma.role.findFirst({
        where: {
          role_type: "SVRO",
        },
        select: {
          role_id: true
        }
      })
      const curr_user = await prisma.user.findFirst({
        where: {
          email: current_user.email
        },
        select: {
          user_id: true,
          name: true,
        }
      })

      // Create the address record
      const addressRecord = await prisma.address.create({
        data: {
          mandal, state, district, address, pincode, sachivalayam
        },
        select: {
          address_id: true,
        }
      });

      // Create the application
      const application = await prisma.application.create({
        data: {
          full_name,
          dob: new Date(dob),
          gender,
          religion,
          sub_caste: sub_caste || "NA",
          parent_religion,
          parent_guardian_type:
            parentGuardianTypeRecord ? { connect: { id: parentGuardianTypeRecord.id } } : undefined,
          parent_guardian_name,
          marital_status,
          aadhar_num,
          phone_num,
          email,
          caste:
            casteRecord ? {
              connect: {
                caste_id: casteRecord.caste_id
              }
            } : undefined,
          address: addressRecord ? { connect: { address_id: addressRecord.address_id } } : undefined,
          applied_by: { connect: { user_id: curr_user.user_id } },
          mvro_user: mvroId ? { connect: { user_id: mvroUserId.user_id } } : undefined,
          svro_user: svro ? { connect: { user_id: svro.user_id } } : undefined,
          ri_user: ri.length ? { connect: { user_id: ri[0].user_id } } : undefined,
          mro_user: mro.length ? { connect: { user_id: mro[0].user_id } } : undefined,
          current_stage: { connect: { role_id: current_stage.role_id } },
          status: "PENDING",
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

  router.get("/application/:app_id", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization; // Get the authorization token
        const user = getUserFromToken(authorizationHeader); // Function to extract user data from token
        const user_row = await prisma.user.findFirst({
          where:{
            name : user.name
          },
          select:{
            user_id: true,
          }
        })
        const { app_id } = req.params; // Extract the application id from the URL parameter

        // Fetch the application data based on the app_id
        const application = await prisma.application.findUnique({
            where: {
                application_id: parseInt(app_id), // Use the application_id from the URL
            },
            include: {
                applied_by: true, // Include the User who applied
                caste: true, // Include the caste details
                parent_guardian_type: true, // Include parent guardian type details
                address: true, // Include address details
                addressProof: true, // Include address proof if available
                casteProof: true, // Include caste proof if available
                dobProof: true, // Include DOB proof if available
                mvro_user: true, // Include MVRO details
                svro_user: true, // Include SVRO details
                ri_user: true, // Include RI details
                mro_user: true, // Include MRO details
                current_stage: { // Include the current stage (Role) of the application
                    select: {
                        role_type: true, // Select the role_type field from the Role model
                    },
                },
                certificate: true, // Include certificate if exists
                report: true, // Include report details
                reCheck: true, // Include reCheck details
            },
        });
        const report = await prisma.report.findFirst({
          where:{
            application_id: parseInt(app_id),
            handler:{
              user_id : user_row.user_id
            }
          },
          select:{
            report_id:true
          }
        })
        console.log(report, " is the report")
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        return res.status(200).json({ data: application, "report":report });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ message: "There was an error fetching the application data" });
    }
});

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

router.get("/check_aadhaar/:aadhar_num",async (req,res)=>{
  const aadhar = (req.params.aadhar_num)
  try{
    const applicationCount = await prisma.application.count({
      where:{
        aadhar_num: aadhar
      }
    })
    return res.status(200).json({"numOfApplications":applicationCount})
  }
  catch(e){
    console.log(e);
    return res.status(400).json({"message":"There is an error in the request"})
  }
})

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
