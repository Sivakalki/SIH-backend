const express = require("express");
const router = express.Router(); // Initialize the router
const prisma = require('../prisma/prisma')
const { hashPwd, comparePwd } = require("../utils/passwordHash");
const { generateToken, verifyToken } = require("../utils/tokenUtils");
const { response } = require("..");
const { verify } = require("jsonwebtoken");


router.get('/', (req, res) => { // Define the route
    res.status(200).send("Hello");
});

router.post('/login', async (req, res) => {
    try {
        const users = await prisma.user.findFirst({
            where: {
                email: req.body.email
            }
        }
        )
        if (!users) {
            return res.status(404).json({ "message": "User doesn't exist" })
        }
        let hashedPassword = users.password
        let passwordMatch = await comparePwd(req.body.password, hashedPassword)
        // console.log(passwordMatch)
        if (passwordMatch) {
            const generatedToken = generateToken({ username: users.username, email: users.email })
            return res.status(200).json({ "message": "Succesfully logged in", token: generatedToken ,data:users})
        }
        return res.status(400).json({ "message": "Wrong Password" })
        
    } catch (error) {
        console.log(error)
    }
    
})

router.post("/signup", async (req, res) => {
    try {
      // Check if the user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: req.body.email },
            { username: req.body.username }
          ]
        }
      });
      if (existingUser) {
        return res.status(403).json({ message: "User already exists with that email-id or username" });
      }
  
      // Check if passwords match
      if (req.body.password !== req.body.confirm_password) {
        return res.status(403).json({ message: "Passwords didn't match" });
      }
  
      // Hash the password
      const hashedPassword = await hashPwd(req.body.password);
  
      // Generate token
      const generatedToken = generateToken({ username: req.body.username, email: req.body.email });
  
      // Determine role
      let role = "USER";
      if (req.body.role) {
        role = req.body.role;
      }
  
      // Prepare related data for District, MRO, or VRO based on role
      let districtData = null;
      let mroData = null;
      let vroData = null;
  
      if (role === "DISTRICT") {
        if (!req.body.district || !req.body.state) {
          return res.status(400).json({ message: "District and state are required for DISTRICT role" });
        }
        districtData = await prisma.district.create({
          data: {
            district: req.body.district,
            state: req.body.state
          }
        });
      } else if (role === "MRO") {
        if (!req.body.mandal || !req.body.district || !req.body.state) {
          return res.status(400).json({ message: "Mandal, district, and state are required for MRO role" });
        }
        mroData = await prisma.mRO.create({
          data: {
            mandal: req.body.mandal,
            district: req.body.district,
            state: req.body.state
          }
        });
      } else if (role === "VRO") {
        if (!req.body.village || !req.body.mandal || !req.body.district || !req.body.state || !req.body.pincode) {
          return res.status(400).json({ message: "Village, mandal, district, pincode and state are required for VRO role" });
        }
        vroData = await prisma.vRO.create({
          data: {
            village: req.body.village,
            mandal: req.body.mandal,
            district: req.body.district,
            state: req.body.state,
            pincode: req.body.pincode
          }
        });
      }
  
      // Create the user
      const user = await prisma.user.create({
        data: {
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          role: role,
          district: districtData ? { connect: { id: districtData.id } } : undefined,
          mro: mroData ? { connect: { id: mroData.id } } : undefined,
          vro: vroData ? { connect: { id: vroData.id } } : undefined
        }
      });
  
      // Return success response
      return res.status(200).json({
        message: "User Created Successfully",
        token: generatedToken,
        data: user
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });
  

router.get("/user", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        // Log the authorization header for debugging (can be removed in production)
        console.log("Authorization Header:", authHeader);

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
        console.log(decoded);
        // Fetch the user data using the ID from the decoded token
        const user = await prisma.user.findUnique({
            where: { email: decoded.email },
            select: { id: true, username: true, email: true, role:true } // Select only required fields
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

module.exports = router; // Export the router
