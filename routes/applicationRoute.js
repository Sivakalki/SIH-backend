const express = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../prisma/prisma"); // Import Prisma client
const { log } = require("console");
const { getUserFromToken } = require("../utils/findUser");
const router = express.Router();
const {sendMail} = require("../utils/sendEmail");
const { CLIENT_RENEG_LIMIT } = require("tls");
const { sendSms } = require("../utils/notifications");

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
        addressProofType,
        dobProofType,
        casteProofType,
      } = req.body;

      console.log(req.body);
      // Parse addressDetails if it's a string
      const addressObj = typeof addressDetails === 'string' ? JSON.parse(addressDetails) : addressDetails;
      const { pincode, state, district, mandal, address, sachivalayam } = addressObj;

      // Validate required fields
      if (!full_name || !dob || !gender || !religion || !marital_status || !aadhar_num || !phone_num || !email || !addressDetails) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate address details
      if (!pincode || !state || !district || !mandal) {
        return res.status(400).json({ message: "Incomplete address details Pincode, state, district, and mandal are required" });
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
      console.log(req.files, " are the files")
      // Handle proof files
      const addressProofFile = req.files?.["addressProof"]?.[0];
      const dobProofFile = req.files?.["dobProof"]?.[0];
      const casteProofFile = req.files?.["casteProof"]?.[0];

      // Validate required files first
      if (!addressProofFile || !dobProofFile || !casteProofFile) {
        return res.status(400).json({ 
          message: "All proof files are required",
          missing: {
            addressProof: !addressProofFile,
            dobProof: !dobProofFile,
            casteProof: !casteProofFile
          }
        });
      }

      // Create proof records
      const addressProof = await prisma.addressProof.create({
        data: {
          filepath: `/uploads/${addressProofFile.filename}`,
          type: {
            connect: {
              addressProofType: addressProofType
            }
          }
        }
      });

      const dobProof = await prisma.dobProof.create({
        data: {
          filepath: `/uploads/${dobProofFile.filename}`,
          type: {
            connect: {
              dobProofType: dobProofType
            }
          }
        }
      });

      const casteProof = await prisma.casteProof.create({
        data: {
          filepath: `/uploads/${casteProofFile.filename}`,
          type: {
            connect: {
              casteProofType: casteProofType
            }
          }
        }
      });

      console.log(addressProof, dobProof, casteProof, " are the proofs")
      // Create the application record

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
      console.log(mvros, " are the mvros")
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

      console.log(ri,mandal, " are the ri")
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

      console.log(sachivalayam, " is the sachivalayam")
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
      console.log(mvroId, " is the mvroid")
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
      console.log(mvroId, " is the final mvroid")
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

      console.log(ri, " is the ri")

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
          addressProof: { connect: {
            id: addressProof.id
          }},
          dobProof: { connect: { 
            id: dobProof.id
          } },
          casteProof: { connect: {
            id : casteProof.id
           } }, 
        }
      });

      // Send confirmation email
      const emailText = `Your caste certificate application has been successfully submitted.\n\nTracking ID: ${application.application_id}\n\nYou can use this tracking ID to check the status of your application.`;
      await sendSms(phone_num, emailText);
      await sendMail(
        email, 
        emailText,
        "Caste Certificate Application Submitted Successfully"
      );

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

        console.log(user_row, " is the user")
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
        const resend = await prisma.reCheck.findFirst({
          where:{
            application_id: parseInt(app_id)
          },
          select:{
            id:true,
            status:true
          }
        })
        console.log(report, " is the report")
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        return res.status(200).json({ data: application, "report":report , "recheck":resend});
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ message: "There was an error fetching the application data" });
    }
});

router.get("/edit_application/:application_id", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "No authorization header" });
        }

        const user_email = getUserFromToken(authHeader);
        const user = await prisma.user.findFirst({
            where: {
                email: user_email.email
            },
            select: {
                user_id: true
            }
        });
        if (!user) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const application_id = parseInt(req.params.application_id);
        if (!application_id) {
            return res.status(400).json({ message: "Invalid application ID" });
        }

        const application = await prisma.application.findUnique({
            where: {
                application_id: application_id
            },
            include: {
                applied_by: {
                    select: {
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                caste: true,
                address: true,
                addressProof: {
                    include: {
                        type: true
                    }
                },
                casteProof: {
                    include: {
                        type: true
                    }
                },
                dobProof: {
                    include: {
                        type: true
                    }
                },
                parent_guardian_type: true,
                current_stage: true,
                reCheck: {
                    orderBy: {
                        created_at: 'desc'
                    }
                }
            }
        });

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        console.log(application.applied_by_id, " is the applied_by_id and ", user.user_id, " is the user_id")

        // Check if user has permission to view this application
        if (application.applied_by_id !== user.user_id) {
            return res.status(403).json({ message: "You don't have permission to view this application" });
        }

        // Format the response
        const formattedResponse = {
            application_id: application.application_id,
            full_name: application.full_name,
            dob: application.dob,
            gender: application.gender,
            religion: application.religion,
            caste: application.caste.caste_type,
            sub_caste: application.sub_caste,
            parent_religion: application.parent_religion,
            parent_guardian_type: application.parent_guardian_type.type,
            parent_guardian_name: application.parent_guardian_name,
            address: {
                pincode: application.address.pincode,
                state: application.address.state,
                district: application.address.district,
                mandal: application.address.mandal,
                sachivalayam: application.address.sachivalayam,
                address: application.address.address
            },
            proofs: {
                address: application.addressProof ? {
                    type: application.addressProof.type.addressProofType,
                    filepath: application.addressProof.filepath
                } : null,
                caste: application.casteProof ? {
                    type: application.casteProof.type.casteProofType,
                    filepath: application.casteProof.filepath
                } : null,
                dob: application.dobProof ? {
                    type: application.dobProof.type.dobProofType,
                    filepath: application.dobProof.filepath
                } : null
            },
            marital_status: application.marital_status,
            aadhar_num: application.aadhar_num,
            phone_num: application.phone_num,
            email: application.email,
            status: application.status,
            current_stage: application.current_stage?.role_type || null,
            created_at: application.created_at,
            updated_at: application.updated_at,
            recheck: application.reCheck[0] || null,
            rejection_reason: application.rejection_reason
        };

        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error("Error fetching application details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put("/edit_application/:app_id", async (req, res) => {
  try {
    const app_id = parseInt(req.params.app_id);
    if (!app_id) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No authorization header" });
    }

    const user_email = getUserFromToken(authHeader);
    const user = await prisma.user.findFirst({
      where: {
        email: user_email.email
      },
      select: {
        user_id: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Find the application and check ownership
    const existingApplication = await prisma.application.findFirst({
      where: {
        application_id: app_id,
        applied_by_id: user.user_id
      }
    });

    if (!existingApplication) {
      return res.status(404).json({ message: "Application not found or you don't have access" });
    }

    // Extract fields from request body
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
      address,
      marital_status,
      aadhar_num,
      phone_num,
      email
    } = req.body;

    // First, update the address if provided
    let addressUpdate;
    if (address) {
      addressUpdate = await prisma.address.update({
        where: {
          address_id: existingApplication.address_id
        },
        data: {
          pincode: address.pincode,
          state: address.state,
          district: address.district,
          mandal: address.mandal,
          sachivalayam: address.sachivalayam,
          address: address.address
        }
      });
    }

    // Get caste_id if caste is provided
    let caste_id;
    if (caste) {
      const casteRecord = await prisma.caste.findUnique({
        where: {
          caste_type: caste
        }
      });
      if (casteRecord) {
        caste_id = casteRecord.caste_id;
      }
    }

    // Get parent_guardian_id if parent_guardian_type is provided
    let parent_guardian_id;
    if (parent_guardian_type) {
      const guardianType = await prisma.parentGuardianType.findUnique({
        where: {
          type: parent_guardian_type
        }
      });
      if (guardianType) {
        parent_guardian_id = guardianType.id;
      }
    }

    // Update the application
    const updatedApplication = await prisma.application.update({
      where: { application_id: app_id },
      data: {
        ...(full_name && { full_name }),
        ...(dob && { dob: new Date(dob) }),
        ...(gender && { gender }),
        ...(religion && { religion }),
        ...(caste_id && { caste_id }),
        ...(sub_caste && { sub_caste }),
        ...(parent_religion && { parent_religion }),
        ...(parent_guardian_id && { parent_guardian_id }),
        ...(parent_guardian_name && { parent_guardian_name }),
        ...(marital_status && { marital_status }),
        ...(aadhar_num && { aadhar_num }),
        ...(phone_num && { phone_num }),
        ...(email && { email })
      },
      include: {
        caste: true,
        address: true,
        parent_guardian_type: true,
        addressProof: {
          include: {
            type: true
          }
        },
        casteProof: {
          include: {
            type: true
          }
        },
        dobProof: {
          include: {
            type: true
          }
        }
      }
    });

    // Update the recheck status to Completed
    await prisma.reCheck.update({
      where: {
        application_id: parseInt(app_id)
      },
      data: {
        status: "COMPLETED"
      }
    });

    return res.status(200).json({
      message: "Application updated successfully",
      application: updatedApplication
    });
  } catch (error) {
    console.error("Error updating application:", error);
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
    console.log("entered ehre")
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

router.get("/myapplications", async (req, res) => {
  try {
    // Get user from authorization token
    const user = await getUserFromToken(req.headers.authorization);
    const current_user = await prisma.user.findUnique({
      where: {
        email: user.email
      },
      select:{
        user_id: true
      }
    });
    
    if (!current_user) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // Fetch all applications for the user
    const userApplications = await prisma.application.findMany({
      where: {
        applied_by: {
          user_id: current_user.user_id
        }
      },
      select: {
        application_id: true,
        full_name: true,
        status: true,
        aadhar_num: true
      }
    });

    return res.status(200).json({
      message: "Applications retrieved successfully",
      applications: userApplications
    });

  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
});

router.get("/application_status/:application_id", async (req, res) => {
  try {
    let { application_id } = req.params;
    application_id = parseInt(application_id);

    // Find the application
    const application = await prisma.application.findUnique({
      where: {
        application_id: application_id
      },
      select: {
        full_name: true,
        application_id: true,
        status: true,
        current_stage: {
          select: {
            role_type: true
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({
        message: "No application found with the provided application ID"
      });
    }

    return res.status(200).json({
      message: "Application status retrieved successfully",
      application
    });

  } catch (error) {
    console.error("Error fetching application status:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
});

router.get("/recheck_applications", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "No authorization header" });
        }

        const user = getUserFromToken(authHeader);
        if (!user) {
            return res.status(401).json({ message: "Invalid token" });
        }
        
        // Get all applications by the current user that have recheck requests
        const applications = await prisma.application.findMany({
            where: {
                applied_by_id: user.user_id,
                reCheck: {
                    some: {} // Only get applications that have recheck requests
                }
            },
            select: {
                application_id: true,
                full_name: true,
                reCheck: {
                    select: {
                        description: true,
                        created_at: true,
                        status: true,
                    }
                }
            }
        });

        if (!applications) {
            return res.status(404).json({ message: "No recheck applications found" });
        }

        // Format the response
        const formattedApplications = applications.map(app => ({
            application_id: app.application_id,
            fullname: app.full_name,
            reportDescription: app.reCheck[0]?.description || '',
            reportCreated_at: app.reCheck[0]?.created_at || null,
            status: app.reCheck[0]?.status || '',
        }));

        res.status(200).json(formattedApplications);
    } catch (error) {
        console.error("Error fetching recheck applications:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
