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
    const { email, username, password, confirm_password, role, phone, ...rest } = req.body;

    // Validate passwords
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if the user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email:email }, { name:username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email or username." });
    }

    // Hash the password
    const hashedPassword = await hashPwd(password);

    let user = null;
    let relatedData = null;

    const role_id =await prisma.role.findFirst({
      where:{
        role_type: role
      },
      select:{
        role_id: true
      }
    })

    console.log(role_id)
    // Create user first
    user = await prisma.user.create({
      data: {
        email,
        name:username,
        password: hashedPassword,
        phone,
        role_id:role_id.role_id
      }
    });

   
    // Role-specific logic
    switch (role_id.role_id) {
      case 0:
        // No additional data needed for applicants
        break;

      case 3:  //svro
        if (!rest.pincode || !rest.state || !rest.district || !rest.mandal || !rest.sachivalayam) {
          return res.status(400).json({
            message: "Pincode, state, district, mandal, and sachivalayam are required for SVRO role."
          });
        }
        relatedData = await prisma.sVRO.create({
          data: {
            pincode: rest.pincode,
            state: rest.state,
            district: rest.district,
            mandal: rest.mandal,
            sachivalayam: rest.sachivalayam,
            user: {
              connect: { user_id: user.user_id }
            }
          }
        });
        break;

      case 4:   //mvro 
        if (!rest.village || !rest.mandal || !rest.district || !rest.state || !rest.pincode) {
          return res.status(400).json({
            message: "Village, mandal, district, pincode, and state are required for MVRO role."
          });
        }
        relatedData = await prisma.mVRO.create({
          data: {
            village: rest.village,
            mandal: rest.mandal,
            district: rest.district,
            state: rest.state,
            pincode: rest.pincode,
            user: {
              connect: { user_id: user.user_id }
            }
          }
        });
        break;

      case 5:     //RI
        if (!rest.region || !rest.state || !rest.district) {
          return res.status(400).json({
            message: "Region, state, and district are required for RI role."
          });
        }
        relatedData = await prisma.rI.create({
          data: {
            region: rest.region,
            state: rest.state,
            district: rest.district,
            user: {
              connect: { user_id: user.user_id }
            }
          }
        });
        break;

      case 6:     //MRO
        if (!rest.mandal || !rest.district || !rest.state) {
          return res.status(400).json({
            message: "Mandal, district, and state are required for MRO role."
          });
        }
        relatedData = await prisma.mRO.create({
          data: {
            mandal: rest.mandal,
            district: rest.district,
            state: rest.state,
            user: {
              connect: { user_id: user.user_id }
            }
          }
        });
        break;

      default:
        return res.status(400).json({ message: "Invalid role specified." });
    }

    return res.status(201).json({
      message: "User created successfully!",
      user,
      relatedData
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


router.get("/user", async (req, res) => {
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
