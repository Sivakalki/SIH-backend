const express = require("express")
const path = require('path')
const prisma = require("../prisma/prisma")
const { getUserFromToken } = require("../utils/findUser")
const { verifyToken } = require("../utils/tokenUtils");
const { dmmfToRuntimeDataModel } = require("@prisma/client/runtime/library");
const { connect } = require("http2");
const { CLIENT_RENEG_LIMIT } = require("tls");
const { compareSync } = require("bcrypt");
const router = express.Router()

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
        const pendingRole = await prisma.role.findFirst({
            where: {
                role_type: "SVRO",
            },
            select: {
                role_id: true,
            },
        });

        if (!pendingRole) {
            return res.status(404).json({ message: "Pending role not found" });
        }

        const completedRoles = await prisma.role.findMany({
            where: {
                role_type: {
                    not: "SVRO",
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

        // Get pending applications
        const pendingApplications = await prisma.application.count({
            where: {
                svro_user: {
                    user_id: user_id,
                },
                current_stage: {
                    role_id: pendingRole.role_id,
                },
            },
        });

        // Get completed applications
        const completedApplications = await prisma.application.count({
            where: {
                svro_user: {
                    user_id: user_id,
                },
                current_stage: {
                    role_id: {
                        in: completedRoleIds,
                    },
                },
            },
        });

        // Get total applications
        const totalApplications = await prisma.application.count({
            where: {
                svro_user: {
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
                    svro_user: {
                        user_id: user_id
                    }
                },
            }
        })

        const groupedApplications = await prisma.$queryRaw`
            SELECT 
                EXTRACT(YEAR FROM created_at) AS year, 
                EXTRACT(MONTH FROM created_at) AS month, 
                COUNT(application_id) AS application_count
            FROM "Application"
            WHERE  svro_user_id = ${user_id}
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

        // Get calendar events
        const calendarEvents = await prisma.calendarEvent.findMany({
            where: {
                svro_user_id: user_id,
                status: "PENDING"
            },
            select: {
                id: true,
                application_id: true,
                event_date: true,
                application: {
                    select: {
                        full_name: true
                    }
                }
            },
            orderBy: {
                event_date: 'asc'
            }
        });

        // Format calendar events
        const formattedEvents = calendarEvents.map(event => ({
            event_id: event.id,
            application_id: event.application_id,
            applicant_name: event.application.full_name,
            date: event.event_date
        }));

        // Send data to the frontend
        return res.status(200).json({
            pendingApplications,
            completedApplications,
            totalApplications,
            reportNotificatios,
            reCheckApplications,
            reportSubmissions,
            monthlyData: applicationsByMonthYear,
            upcomingEvents: formattedEvents
        });
    } catch (e) {
        console.error(e);
        return res.status(400).json({ message: "There is an error" });
    }
});


router.get("/all_applications", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        if (!authorizationHeader) {
            return res.status(401).json({ error: "Authorization header missing" });
        }

        const user_row = await getUserFromToken(authorizationHeader);
        if (!user_row || !user_row.email) {
            return res.status(401).json({ error: "Invalid authorization token" });
        }

        const user = await prisma.user.findFirst({
            where: {
                email: user_row.email
            },
            select: {
                user_id: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const curr_user_id = user.user_id;
        const applications = await prisma.application.findMany({
            where: {
                svro_user_id: curr_user_id
            },
            select: {
                application_id: true,
                full_name: true,
                status: true,
                current_stage: {
                    select: {
                        role_type: true
                    }
                }
            }
        });

        if (!applications) {
            return res.status(404).json({ error: "No applications found" });
        }

        // Transform the data to flatten the structure
        const formattedApplications = applications.map(app => ({
            app_id: app.application_id,
            full_name: app.full_name,
            status: app.status,
            current_stage: app.current_stage?.role_type || null
        }));

        return res.status(200).json({ "data": formattedApplications });
    } catch (error) {
        console.error("Error in /all_applications:", error);
        return res.status(500).json({ 
            error: "Internal server error", 
            message: error.message 
        });
    }
})

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
        console.log("user is ", user_id.user_id)
        
        // Get applications
        const reports = await prisma.application.findMany({
            where: {
                svro_user_id: user_id.user_id,
                status: 'PENDING',
                current_stage: {
                    role_type: "SVRO"
                }
            },
            select: {
                application_id: true,
                full_name: true,
                current_stage: {
                    select: {
                        role_type: true
                    }
                }
            }
        });

        // Get calendar events for these applications
        const calendarEvents = await prisma.calendarEvent.findMany({
            where: {
                application_id: {
                    in: reports.map(report => report.application_id)
                },
                status: "PENDING"
            },
            select: {
                id: true,
                application_id: true,
                event_date: true,
                notes: true
            }
        });

        // Create a map of application_id to calendar event
        const calendarEventMap = new Map(
            calendarEvents.map(event => [event.application_id, event])
        );

        // Transform the data to include calendar event information
        const formattedReports = reports.map(report => ({
            application_id: report.application_id,
            full_name: report.full_name,
            current_stage: report.current_stage?.role_type || "UNKNOWN",
            calendar_event: calendarEventMap.get(report.application_id) || null
        }));

        return res.status(200).json({ "data": formattedReports });
    } catch (e) {
        console.error("Error in pending_applications:", e);
        res.status(500).json({ "message": "Internal server error", "error": e.message });
    }
})

router.get("/completed_applications", async (req, res) => {
    
    try {
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        const reports = await prisma.application.findMany({
            where: {
                svro_user_id: user.user_id,
                current_stage: {
                    role_type: {
                        not: "SVRO"
                    }
                }
            },
            select: {
                application_id: true,
                current_stage: true,
                full_name: true
            }
        })

        cionsole.log(reports, " are the reports")

        // Transform the data to get only the role_type from current_stage
        const formattedData = reports.map(report => ({
            application_id: report.application_id,
            current_stage: report.current_stage.role_type,
            full_name: report.full_name
        }));

        console.log(formattedData, " are the formatted reports");
        return res.status(200).json({ "data": formattedData })
    } catch (e) {
        console.log(e)
        res.status(400).json({ "message": "There is an error in the request" })
    }
})


router.post("/recheck/:app_id", async (req, res) => {
    try {
        console.log("called here")
        const { app_id } = req.params;
        const authHeader = req.headers.authorization;

        const user_row = await getUserFromToken(authHeader);

        const user = await prisma.user.findUnique({
            where: { email: user_row.email },
            select: { user_id: true,role_id: true }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(parseInt(app_id), " is the app_id");
        
        const application = await prisma.application.findUnique({
            where: {
                application_id: parseInt(app_id)
            },
            select: {
                current_stage: {
                    select: {
                        role_id: true
                    }
                },
                mvro_user: {
                    select: {
                        user_id: true
                    }
                }
            }
        });

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const svro_id = await prisma.role.findFirst({
            where: {
                role_type: "SVRO"
            },
            select: {
                role_id: true
            }
        })

        console.log(user.role_id , svro_id.role_id)
        if (user.role_id !== svro_id.role_id || application.current_stage.role_id !== svro_id.role_id) {
            console.log("entered here")
            return res.status(403).json({ message: "Permission denied" });
        }

        const rejected = await prisma.reCheck.create({
            data: {
                description: req.body.description || "No description provided",
                application: {
                    connect: { application_id: parseInt(app_id) }
                },
                status:"PENDING"
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
        const svro = await prisma.user.findFirst({
            where: {
                name: user.name,
            },
            select: {
                user_id: true,
            },
        });

        if (!svro) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch the required fields of the reports along with the applicant's name
        const reports = await prisma.report.findMany({
            where: {
                handler: {
                    user_id: svro.user_id, // Relate to handler's user_id
                },
            },
            select: {
                report_id: true,
                application_id: true,
                status: true,
                rejection_reason: true,
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
            applicant_name: report.application.full_name,   
        }));

        // Send the formatted report data as a response
        return res.status(200).json({
            "data": formattedReports,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "There is an error", error: e.message });
    }
});

router.get("/get_report/:rep_id", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        
        const { rep_id } = req.params;
        
        const svro = await prisma.user.findFirst({
            where: {
                name: user.name
            },
            select: {
                user_id: true,
            },
        });

        if (!svro) {
            return res.status(404).json({ message: "User not found" });
        }

        const report = await prisma.report.findFirst({
            where: {
                handler_id: svro.user_id,
                report_id: parseInt(rep_id)
            },
            select: {
                report_id: true,
                application_id: true,
                description: true,
                status: true,
                application: {
                    select: {
                        full_name: true
                    }
                }
            }
        });

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        // Transform the data to the required format
        const formattedReport = {
            report_id: report.report_id,
            application_id: report.application_id,
            applicant_name: report.application.full_name,
            description: report.description,
            status: report.status
        };

        return res.status(200).json({
            "data": formattedReport
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
});

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
        const app_svro = await prisma.application.findFirst({
            where: {
                application_id: app_id
            },
            select: {
                svro_user_id: true
            }
        })
        if (app_svro.svro_user_id !== handler.user_id) {
            return res.status(400).json({ "message": "You are not eligible access others application" })
        }
        const level_id = await prisma.role.findFirst({
            where: {
                role_type: "SVRO"
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

        const mvro = await prisma.role.findFirst({
            where: {
                role_type: "MVRO"
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
                        role_id: mvro.role_id
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

router.get("/resent_applications", async (req, res) => {
    try{
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader); // Ensure this function is correctly implemented.
        
        // Get the user details from the token
        const user_row = await prisma.user.findFirst({
            where: {
                name: user.name
            },
            select: {
                user_id: true
            }
        });

        const applications = await prisma.reCheck.findMany({
            where: {
                application: {
                    svro_user: {
                        user_id: user_row.user_id
                    }
                }
            },
            select: {
                application: {
                    select: {
                        application_id: true,
                        full_name: true,
                        status: true,
                    }
                }
            }
        });

        // Transform the nested data structure to flat structure
        const formattedApplications = applications.map(app => ({
            application_id: app.application.application_id,
            full_name: app.application.full_name,
            status: app.application.status
        }));

        console.log(formattedApplications, "are the applications");
        return res.status(200).json({ "data": formattedApplications });
    }
    catch(e){
        console.error(e); // Corrected the variable name from 'error' to 'e'
        res.status(500).json({ "message": "Internal server error" });
    }
})

router.post("/resent_application/:application_id", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader); // Ensure this function is correctly implemented.
        
        // Get the user details from the token
        const user_row = await prisma.user.findFirst({
            where: {
                name: user.name
            },
            select: {
                user_id: true
            }
        });
        
        const  application_id  = parseInt(req.params.application_id); // Consistent parameter name with the route
        const { description } = req.body; // Ensure description is passed in the body
        
        // Fetch SVRO role associated with the application
        const app_svro = await prisma.application.findUnique({
            where: {
                application_id: application_id // Ensure this is the correct field name in the database
            },
            select: {
                svro_user: {
                    select: {
                        user_id: true
                    }
                }
            }
        });
        
        console.log(app_svro, user_row, " are the requested user and svro for the applicant");

        // Ensure user has the correct role to proceed
        if (app_svro.svro_user.user_id !== user_row.user_id) {
            return res.status(400).json({ "message": "You are not authorized to perform this action" });
        }

        // Create re-check report with a "PENDING" status
        const recheck = await prisma.reCheck.create({
            data: {
                application: {
                    connect: {
                        application_id: application_id
                    }
                },
                description,
                status: "PENDING"
            }
        });

        return res.status(200).json({ "message": "Successfully recheck report is sent to applicant" });

    } catch (e) {
        console.error(e); // Corrected the variable name from 'error' to 'e'
        res.status(500).json({ "message": "Internal server error" });
    }
});

// Add calendar event for an application
router.post("/calendar/:application_id", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        const application_id = parseInt(req.params.application_id);
        const { date, notes } = req.body;

        console.log(date, "is the event date")
        // Get SVRO user details
        const svroUser = await prisma.sVRO.findFirst({
            where: {
                user: {
                    name: user.name
                }
            },
            select: {
                user_id: true
            }
        });

        if (!svroUser) {
            return res.status(404).json({ error: "SVRO user not found" });
        }

        // Verify application exists and belongs to this SVRO
        const application = await prisma.application.findFirst({
            where: {
                application_id: application_id,
                svro_user_id: svroUser.user_id
            }
        });

        if (!application) {
            return res.status(404).json({ error: "Application not found or not assigned to this SVRO" });
        }

        // Create calendar event
        const calendarEvent = await prisma.calendarEvent.create({
            data: {
                svro_user_id: svroUser.user_id,
                application_id: application_id,
                event_date: new Date(date),
                status: "PENDING",
                notes: notes || null
            }
        });

        res.status(201).json({
            message: "Calendar event created successfully",
            calendarEvent
        });

    } catch (error) {
        console.error("Error creating calendar event:", error);
        res.status(500).json({ error: "Failed to create calendar event" });
    }
});

// Update calendar event
router.put("/calendar/:event_id", async (req, res) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const user = getUserFromToken(authorizationHeader);
        const event_id = parseInt(req.params.event_id);
        const { date, notes, status } = req.body;

        // Get SVRO user details
        const svroUser = await prisma.sVRO.findFirst({
            where: {
                user: {
                    name: user.name
                }
            },
            select: {
                user_id: true
            }
        });

        if (!svroUser) {
            return res.status(404).json({ error: "SVRO user not found" });
        }

        // Verify calendar event exists and belongs to this SVRO
        const existingEvent = await prisma.calendarEvent.findFirst({
            where: {
                id: event_id,
                svro_user_id: svroUser.user_id
            }
        });

        if (!existingEvent) {
            return res.status(404).json({ error: "Calendar event not found or not assigned to this SVRO" });
        }

        // Update calendar event
        const updatedEvent = await prisma.calendarEvent.update({
            where: {
                id: event_id
            },
            data: {
                event_date: date ? new Date(date) : undefined,
                notes: notes !== undefined ? notes : undefined,
                status: status || undefined
            }
        });

        res.status(200).json({
            message: "Calendar event updated successfully",
            calendarEvent: updatedEvent
        });

    } catch (error) {
        console.error("Error updating calendar event:", error);
        res.status(500).json({ error: "Failed to update calendar event" });
    }
});

module.exports = router