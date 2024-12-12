const express = require("express")
const path = require('path')
const prisma = require("../prisma/prisma")
const { getUserFromToken } = require("../utils/findUser")
const multer  = require("multer")
const { verifyToken } = require("../utils/tokenUtils");
const { dmmfToRuntimeDataModel } = require("@prisma/client/runtime/library");
const { connect } = require("http2");
const { create } = require("domain");
const router = express.Router()
const {sendEmail} = require("../utils/sendEmail")
// const {sendSms} = require("../utils/sendSms")


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Specify the directory where files will be stored
        cb(null, "certificates/"); // Ensure this folder exists or create it
    },
    filename: (req, file, cb) => {
        // Generate unique filenames using timestamp and original extension
        cb(null, Date.now() + path.extname(file.originalname));
    }
});


const upload = multer({ storage });
router.get("/load_dashboard", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;

        // Validate token and get user details
        const user = getUserFromToken(authorizationHeader);

        // Fetch user ID
        const userRecord = await prisma.user.findFirst({
            where: {
                name: user.name,
            },
            select: {
                user_id: true,
            },
        });

        if (!userRecord) {
            return res.status(404).json({ message: "User not found" });
        }

        const user_id = userRecord.user_id;

        // Fetch role IDs
        const pendingRoles = await prisma.role.findMany({
            where: {
                role_type: {
                    in: ["MVRO","SVRO","RI","MRO"]
                }
            },
            select: {
                role_id: true,
            },
        });

        if (!pendingRoles || pendingRoles.length === 0) {
            return res.status(404).json({ message: "Pending role not found" });
        }

        const completedRoles = await prisma.role.findMany({
            where: {
                role_type: {
                    notIn: ["MVRO","SVRO","RI","MRO"],
                },
            },
            select: {
                role_id: true,
            },
        });

        if (!completedRoles || completedRoles.length === 0) {
            return res.status(404).json({ message: "No completed roles found" });
        }
        const completedRoleIds = completedRoles.map((role) => role.role_id);
        const pendingRoleIds = pendingRoles.map((role) => role.role_id);
        
        // Get pending applications
        const pendingApplications = await prisma.application.count({
            where: {
                mro_user: {
                    user_id: user_id,
                },
                current_stage: {
                    role_id: {
                        in: pendingRoleIds
                    }
                },
            },
        });

        // Get completed applications
        const completedApplications = await prisma.application.count({
            where: {
                mro_user: {
                    user_id: user_id,
                },
                current_stage: {
                    role_id: {
                        in: completedRoleIds, // Check for roles in the completed role IDs
                    },
                },
            },
        });

        // Get total applications
        const totalApplications = await prisma.application.count({
            where: {
                mro_user: {
                    user_id: user_id,
                },
            },
        });

        const reportSubmissions = await prisma.report.count({
            where: {
                handler: {
                    user_id: user_id
                }
            }
        })

        const reportNotificatios = await prisma.report.count({
            where: {
                handler: {
                    user_id: user_id
                },
                status: "REJECTED"
            }
        })

        const reCheckApplications = await prisma.reCheck.count({
            where: {
                application: {
                    mro_user: {
                        user_id: user_id
                    }
                },
            }
        })

        const mro = await prisma.role.findFirst({
            where: {
                role_type: "mro"
            },
            select: {
                role_id: true
            }
        })

        const readyApplications = await prisma.application.count({
            where: {
                mro_user: {
                    user_id: user_id
                },
                current_stage: {
                    role_id: mro.role_id
                }
            }
        })

        const groupedApplications = await prisma.$queryRaw`
            SELECT 
                EXTRACT(YEAR FROM created_at) AS year, 
                EXTRACT(MONTH FROM created_at) AS month, 
                COUNT(application_id) AS application_count
            FROM "Application"
            WHERE  mro_user_id = ${user_id}
            GROUP BY year, month
            ORDER BY year ASC, month ASC;
        `;

        // Format the grouped data
        const applicationsByMonthYear = groupedApplications.map((group) => {
            const monthNames = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            ];
            return {
                year: group.year,
                month: monthNames[group.month - 1], // Convert month number to name
                applications: parseInt(group.application_count, 10),
            };
        });

        // Send data to the frontend
        return res.status(200).json({
            pendingApplications,
            completedApplications,
            totalApplications,
            reportNotificatios,
            reCheckApplications,
            reportSubmissions,
            readyApplications,
            monthlyData: applicationsByMonthYear
        });
    } catch (e) {
        console.error(e);
        return res.status(400).json({ message: "There is an error" });
    }
});

router.get("/all_applications/:curr_id", async (req, res) => {
    const curr_user_id = req.params.curr_id
    try {
        const reports = await prisma.application.findMany({
            where: {
                mro_id: curr_user_id
            },
            include: {
                address: true, // Include related address details
                caste: true, // Include related caste details
                addressProof: true, // Include related address proof details
                dobProof: true, // Include related DOB proof details
                casteProof: true, // Include related caste proof details
            },
        })
        return res.status(200).json({ "data": reports })
    }
    catch (e) {
        console.log(e)
        res.status(400).json({ "message": "There is an error in the request" })
    }
})

router.get("/ready_to_review/", async (req, res) => {
    try {
        // Check authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                success: false,
                message: "No token provided" 
            });
        }

        // Get user from token
        const user = getUserFromToken(authHeader);
        if (!user || !user.email) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid token or user not found in token" 
            });
        }

        // Find user in database
        const curr_user = await prisma.user.findFirst({
            where: {
                email: user.email
            },
            select: {
                user_id: true,
                role: {
                    select: {
                        role_type: true
                    }
                },
            }
        });

        const curr_mro = await prisma.mRO.findFirst({
            where: {
                user_id: curr_user.user_id
            },
            select:{
                mro_id: true
            }
        })
        if (!curr_mro) {
            return res.status(404).json({ 
                success: false,
                message: "User not found in database" 
            });
        }
    
        // Get ri role
        const mro = await prisma.role.findFirst({
            where: {
                role_type: "MRO"
            },
            select: {
                role_id: true
            }
        });
        if(curr_user.role.role_type !== "MRO") {
            return res.status(400).json({ 
                success: false,
                message: "You are not eligible to get the applications" 
            });
        }

        if (!mro) {
            return res.status(500).json({ 
                success: false,
                message: "MRO role not found in system" 
            });
        }

        console.log(mro.role_id,curr_user.user_id, " is the role id of mro");

        // Get applications
        const applications = await prisma.application.findMany({
            where: {
                mro_user_id: curr_mro.mro_id,
                current_stage: {
                    role_id: mro.role_id
                }
            },
            include: {
                address: true,
                caste: true,
                addressProof: true,
                dobProof: true,
                casteProof: true,
                current_stage: true,
            }
        });

        return res.status(200).json({ 
            success: true,
            message: "Applications fetched successfully",
            data: applications 
        });
    }
    catch (error) {
        console.error("Error in ready_to_review:", error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: error.message 
        });
    }
});

router.get("/pending_applications", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        const user_id = await prisma.user.findFirst({
            where: {
                name: user.name
            },
            select: {
                user_id: true
            }
        })
        if (user_id === null) {
            return res.status(400).json({ "message": "You are not eligible to get the applications" })
        }
        const reports = await prisma.application.findMany({
            where: {
                mro_user: {
                    user_id: user_id.user_id,
                },
                status: 'PENDING',
            },
            select: {
                application_id: true,
                current_stage: {
                    select: {
                        role_type: true
                    }
                },
                status: true,
                full_name: true,
            }

        })
        const mappedReports = reports.map((report) => ({
            application_id: report.application_id,
            full_name: report.full_name,
            status: report.status,
            current_stage: report.current_stage.role_type, // Access role_type from the role relation
        }));
        console.log(mappedReports)
        return res.status(200).json({ "data": mappedReports })
    }
    catch (e) {
        console.log(e)
        res.status(400).json({ "message": "There is an error in the request" })
    }
});

router.get("/completed_applications", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        const user_id = await prisma.user.findFirst({
            where: {
                email: user.email
            },
            select: {
                user_id: true
            }
        })
        if (user_id === null) {
            return res.status(400).json({ "message": "You are not eligible to get the applications" })
        }
        console.log('User object:', user);
        if (!user || !user_id.user_id) {
            return res.status(400).json({ "message": "Invalid user" });
        }
        const reports = await prisma.application.findMany({
            where: {
                mro_user: {
                    user_id: user_id.user_id   
                },
                current_stage: {
                    role_type : {
                        notIn: ['mro', 'SVRO']
                    }
                },
                status: 'PENDING',
            },
            select: {
                application_id: true,
                current_stage: true,
                full_name: true
            }
        })
        const formattedData = reports.map(report => ({
            application_id: report.application_id,
            current_stage: report.current_stage.role_type,
            full_name: report.full_name
        }));
        return res.status(200).json({ "data": formattedData })
    }
    catch (e) {
        console.log(e)
        res.status(400).json({ "message": "There is an error in the request" })
    }
})

router.post('generate_certificate/:app_id', upload.single('file'), async (req, res) => {
    try {
        const { app_id } = req.params;
    
        // Find the application and fetch related caste_id
        const application = await prismaClient.application.findUnique({
          where: { application_id: parseInt(app_id) },
          select: {
            caste_type: true
          }
        });
    
        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }
    
        const caste_id = application.caste_id;
    
        // Handle file upload
        if (!req.file) {
          return res.status(400).json({ message: "File not provided" });
        }
    
        const file_path = req.file.path;
    
        // Calculate validity (one year from now)
        const validity = new Date();
        validity.setFullYear(validity.getFullYear() + 1);
    
        // Create the certificate entry in the database
        const certificate = await prismaClient.certificate.create({
          data: {
            caste_id,
            validity,
            file_path,
            application_id: parseInt(app_id)
          } 
        });
        sendEmail(application.email,"Your caste certificate has been generated", "The certificate has been generated successfully")
        console.log(certificate, " is the certificate")
        return res.status(201).json({
          message: "Certificate generated successfully",
          certificate
        });
      } catch (e) {
        console.error(e);
        res.status(400).json({ message: "There is an error in the request" });
      }
    });
    

router.post("/recheck/:app_id", async (req, res) => {
    try {
        const { app_id } = req.params;
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const user = await prisma.user.findUnique({
            where: { email: decoded.email },
            select: { id: true, username: true, email: true, role_id: true }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const application = await prisma.application.findUnique({
            where: { application_id: app_id },
            select: { current_stage_id: true, mro_user_id: true }
        });

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        if (user.role_id !== 3 || application.mro_user_id || application.current_stage_id !== 3) {
            return res.status(403).json({ message: "Permission denied" });
        }

        const rejected = await prisma.reCheck.create({
            data: {
                description: req.body.description || "No description provided",
                application: {
                    connect: { application_id: app_id }
                }
            }
        });

        return res.status(200).json({ message: "Recheck request submitted successfully", recheck: rejected });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

router.get("/get_reports", async (req, res) => {
    try {
        // Extract and validate the authorization token
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        if (!user || !user.name) {
            return res.status(401).json({ message: "Unauthorized: User not found in token" });
        }

        // Fetch the user's ID from the database
        const mro = await prisma.user.findFirst({
            where: {
                name: user.name,
            },
            select: {
                user_id: true,
            },
        });

        if (!mro) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch the required fields of the reports along with the applicant's name
        const reports = await prisma.report.findMany({
            where: {
                handler: {
                    user_id: mro.user_id, // Relate to handler's user_id
                },
            },
            select: {
                report_id: true,
                application_id: true,
                status: true,
                rejection_reason: true,
                description: true,
                created_time: true,
                application: {
                    select: {
                        full_name: true, // Fetch applicant's name from the application
                    },
                },
            },
        });

        if (!reports || reports.length === 0) {
            return res.status(404).json({ message: "No reports found for the user" });
        }

        // Map the response to include applicant_name
        const formattedReports = reports.map(report => ({
            report_id: report.report_id,
            application_id: report.application_id,
            status: report.status,
            rejection_reason: report.rejection_reason,
            created_time: report.created_time,
            description: report.description,
            applicant_name: report.application.full_name,
        })).sort((a, b) => a.report_id - b.report_id);

        // Send the formatted report data as a response
        return res.status(200).json({
            "data": formattedReports,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "There is an error", error: e.message });
    }
});

router.post("reject_application/:app_id", async (req, res) => {
    try {
        const { app_id } = req.params;
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ message: "Description is required" });
        }

        const applicaiton = await prisma.application.update({
            where: {
                application_id: parseInt(app_id)
            },
            data: {
                status: "REJECTED",
                rejection_reason: description
            }
        })
        sendEmail(applicaiton.email,"Your caste certificate has been rejected", description)
        return res.status(200).json({ "message": "Application rejected successfully" })
    }
    catch (e) { 
        console.log(e)  
        res.status(400).json({ "message": "There is an error in the request" })
    }
})

router.get("/get_report/:rep_id", async (req, res) => {
    try {
        // Extract and validate the authorization token
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        if (!user || !user.name) {
            return res.status(401).json({ message: "Unauthorized: User not found in token" });
        }
        const report_id = parseInt(req.params.rep_id)
        // Fetch the user's ID from the database
        const ri = await prisma.user.findFirst({
            where: {
                name: user.name,
            },
            select: {
                user_id: true,
            },
        });

        if (!ri) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch the report associated with the user
        const report = await prisma.report.findFirst({
            where: {
                handler: {
                    user_id: ri.user_id, // Relate to handler's user_id
                },
                report_id,

            },
            include: {
                level: true,       // Include details about the level
                application: true, // Include details about the application
            },
        });

        if (!report) {
            return res.status(404).json({ message: "No reports found for the user" });
        }

        // Send the report data as a response
        return res.status(200).json({
            "data": report
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "There is an error", error: e.message });
    }
})

router.put("/edit_report/:rep_id", async (req, res) => {
    try {
        let { rep_id } = req.params; // Extract report ID from URL
        rep_id = parseInt(rep_id)
        const { description } = req.body; // Extract updated fields from request body



        // Ensure required fields are provided
        if (!description) {
            return res.status(400).json({ message: "Description is required" });
        }
        const authorizationHeader = req.headers.authorization;
        const handler_name = await getUserFromToken(authorizationHeader);
        const handler = await prisma.user.findFirst({
            where: {
                name: handler_name.name,
            },
            select: {
                user_id: true
            }
        })

        console.log(handler.user_id, rep_id, " are used to get the user")
        const report = await prisma.report.findFirst({
            where: {
                report_id: rep_id,
                handler: {
                    user_id: handler.user_id
                }
            }
        });
        if (!report) {
            console.log("report not found")
            return res.status(404).json({ message: "Report not found/ User is not eligible to edit this report" });
        }

        // Update the report
        await prisma.report.update({
            data: { description }, // Update the 'description' field
            where: { report_id: rep_id }, // Match the record using 'report_id'
        });


        return res.status(200).json({ message: "Report updated successfully", "description": description });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/create_report/:app_id", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const handler_name = getUserFromToken(authorizationHeader); // Replace with your logic to extract and validate the user
        const app_id = parseInt(req.params.app_id);
        const handler = await prisma.user.findFirst({
            where: {
                name: handler_name.name
            },
            select: {
                user_id: true
            }
        })
        const app_ri = await prisma.application.findFirst({
            where: {
                application_id: app_id
            },
            select: {
                ri_user_id: true
            }
        })
        if (app_ri.ri_user_id !== handler.user_id) {
            return res.status(400).json({ "message": "You are not eligible access others application" })
        }
        console.log(handler, handler_name, "are the userss")
        const level_id = await prisma.role.findFirst({
            where: {
                role_type: "RI"
            },
            select: {
                role_id: true
            }
        })
        const { description } = req.body;
        // Validate input
        if (!description) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Fetch application
        const application = await prisma.application.findUnique({
            where: { application_id: app_id },
        });

        const ri = await prisma.role.findFirst({
            where: {
                role_type: "RI"
            },
            select: {
                role_id: true
            }
        })

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        // Create the report
        const newReport = await prisma.report.create({
            data: {
                application: {
                    connect: {
                        application_id: app_id
                    }
                },
                level: {
                    connect: {
                        role_id: level_id.role_id
                    }
                },
                handler: {
                    connect: {
                        user_id: handler.user_id
                    }
                },
                description,
                status: "PENDING",
            },
        });

        // Update current_stage of the application
        const updatedApplication = await prisma.application.update({
            where: { application_id: app_id },
            data: {
                current_stage: {
                    connect: {
                        role_id: ri.role_id
                    }
                },
                updated_at: new Date(), // Updates the timestamp
            },
        });

        res.status(201).json({
            message: "Report created and application stage updated successfully",
            report: newReport,
            application: updatedApplication,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router