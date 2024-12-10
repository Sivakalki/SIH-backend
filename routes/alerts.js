// const express = require('express');
// const router = express.Router();
// const prisma = require("../prisma/prisma");
// const cron = require('node-cron');
// const nodemailer = require('nodemailer');

// // Create email transporter
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD
//     }
// });

// // Function to send email
// async function sendEmail(to, subject, html) {
//     try {
//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to,
//             subject,
//             html
//         };

//         await transporter.sendMail(mailOptions);
//         console.log(`Email sent to ${to}`);
//     } catch (error) {
//         console.error('Error sending email:', error);
//     }
// }

// // Function to create HTML content for email
// function createEmailContent(application, type, timeInfo) {
//     const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
//     return `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//             <div style="background-color: #1890ff; color: white; padding: 20px; text-align: center;">
//                 <h1 style="margin: 0;">Application Update</h1>
//             </div>
//             <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
//                 <h2 style="color: #1890ff;">Application #${application.application_id}</h2>
//                 <p><strong>Applicant:</strong> ${application.full_name}</p>
//                 <p><strong>Status:</strong> ${type}</p>
//                 <p><strong>Time Information:</strong> ${timeInfo}</p>
//                 <p><strong>Current Stage:</strong> ${application.current_stage.role_type}</p>
                
//                 <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5;">
//                     <p><strong>Action Required:</strong></p>
//                     <p>Please review this application at your earliest convenience.</p>
//                 </div>
                
//                 <div style="margin-top: 20px; text-align: center;">
//                     <a href="${baseUrl}/applications/${application.application_id}" 
//                        style="background-color: #1890ff; color: white; padding: 10px 20px; 
//                               text-decoration: none; border-radius: 4px;">
//                         View Application
//                     </a>
//                 </div>
//             </div>
//             <div style="text-align: center; padding: 20px; color: #666;">
//                 <p>This is an automated message. Please do not reply to this email.</p>
//             </div>
//         </div>
//     `;
// }

// // Function to check applications and send email alerts
// async function checkApplicationsAndSendEmails() {
//     try {
//         const currentDate = new Date();
        
//         // Find all scheduled applications
//         const scheduledApplications = await prisma.application.findMany({
//             where: {
//                 scheduled_date: {
//                     not: null
//                 }
//             },
//             include: {
//                 mvro_user: true,
//                 svro_user: true,
//                 current_stage: true
//             }
//         });

//         for (const application of scheduledApplications) {
//             if (!application.scheduled_date) continue;

//             const scheduledDate = new Date(application.scheduled_date);
//             const timeDifference = scheduledDate.getTime() - currentDate.getTime();
//             const hoursDifference = timeDifference / (1000 * 60 * 60);

//             const userEmail = application.current_stage.role_type === 'MVRO' 
//                 ? application.mvro_user.email 
//                 : application.svro_user.email;

//             // Send email for upcoming reviews (24 hours notice)
//             if (hoursDifference <= 24 && hoursDifference > 0) {
//                 const emailContent = createEmailContent(
//                     application,
//                     'UPCOMING_REVIEW',
//                     `Scheduled for review in ${Math.round(hoursDifference)} hours`
//                 );
//                 await sendEmail(
//                     userEmail,
//                     `Upcoming Review - Application #${application.application_id}`,
//                     emailContent
//                 );
//             }
//             // Send email for overdue applications
//             else if (hoursDifference <= 0 && hoursDifference > -24) {
//                 const emailContent = createEmailContent(
//                     application,
//                     'OVERDUE',
//                     `Review overdue by ${Math.round(-hoursDifference)} hours`
//                 );
//                 await sendEmail(
//                     userEmail,
//                     `Overdue Review - Application #${application.application_id}`,
//                     emailContent
//                 );
//             }
//         }

//         // Check for inactive applications
//         const inactiveApplications = await prisma.application.findMany({
//             where: {
//                 updated_at: {
//                     lt: new Date(currentDate.getTime() - 48 * 60 * 60 * 1000)
//                 },
//                 status: 'PENDING'
//             },
//             include: {
//                 mvro_user: true,
//                 svro_user: true,
//                 current_stage: true
//             }
//         });

//         for (const application of inactiveApplications) {
//             const userEmail = application.current_stage.role_type === 'MVRO' 
//                 ? application.mvro_user.email 
//                 : application.svro_user.email;

//             const emailContent = createEmailContent(
//                 application,
//                 'INACTIVE',
//                 'No activity for more than 48 hours'
//             );
//             await sendEmail(
//                 userEmail,
//                 `Inactive Application Alert - #${application.application_id}`,
//                 emailContent
//             );
//         }

//         console.log('Email alerts sent successfully');
//     } catch (error) {
//         console.error('Error sending email alerts:', error);
//     }
// }

// // Schedule the function to run every minute
// cron.schedule('* * * * *', async () => {
//     await checkApplicationsAndSendEmails();
// });

// // Manual trigger endpoint for testing
// router.post('/send-test-email', async (req, res) => {
//     try {
//         const { email, applicationId } = req.body;
        
//         const application = await prisma.application.findUnique({
//             where: { application_id: applicationId },
//             include: {
//                 current_stage: true
//             }
//         });

//         if (!application) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Application not found'
//             });
//         }

//         const emailContent = createEmailContent(
//             application,
//             'TEST_EMAIL',
//             'This is a test email'
//         );

//         await sendEmail(
//             email,
//             `Test Email - Application #${applicationId}`,
//             emailContent
//         );

//         return res.status(200).json({
//             success: true,
//             message: 'Test email sent successfully'
//         });
//     } catch (error) {
//         console.error('Error sending test email:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to send test email',
//             error: error.message
//         });
//     }
// });

// module.exports = router;