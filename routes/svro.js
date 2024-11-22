const express = require("express")
const path = require('path')
const prisma = require("../prisma/prisma")
const {getUserFromToken} = require("../utils/findUser")
const { PrismaClient } = require('@prisma/client');
const { generateToken, verifyToken } = require("../utils/tokenUtils"); 
const router = express.Router()


router.get("/all_applications/:curr_id", async (req, res) => {
    const curr_user_id = req.params.curr_id
    try {
        const reports = await prisma.application.findMany({
            where: {
                svro_id: curr_user_id
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

    router.get("/all_pending_applications", async (req, res) => {
        try {
            const authorizationHeader = req.headers.authorization;
            const user = getUserFromToken(authorizationHeader);
            const reports = await prisma.application.findMany({
                where: {
                    svro_id: user.user_id,
                    status: 'PENDING',
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
                select: { current_stage_id: true, mvro_user_id: true }
            });
    
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }
    
            if (user.role_id !== 3 || application.mvro_user_id || application.current_stage_id !== 3) {
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
    
router.post("/create_report/:app_id", async (req, res) => {

})

module.exports = router