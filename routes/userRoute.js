const express = require("express");
const router = express.Router(); // Initialize the router
const prisma = require('../prisma/prisma')
const { hashPwd, comparePwd } = require("../utils/passwordHash");
const { generateToken, verifyToken } = require("../utils/tokenUtils");
const { fetchRole } = require("../utils/findUser");


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
      const generatedToken = generateToken({ name: users.name, email: users.email })
      const role = await fetchRole(users.role_id)
      console.log("role is ", role)
      return res.status(200).json({ "message": "Succesfully logged in", token: generatedToken, data: users, role: role })
    }
    return res.status(400).json({ "message": "Wrong Password" })

  } catch (error) {
    console.log(error)
  }

})
router.post("/signup/admin", async (req, res) => {
  try {
    const { email, username, password, confirm_password, phone } = req.body;

    // Validate passwords
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if the user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { name: username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email or username." });
    }

    // Hash the password
    const hashedPassword = await hashPwd(password);

    // Get applicant role ID
    const role = await prisma.role.findFirst({
      where: { role_type: "ADMIN" },
      select: { role_id: true },
    });

    console.log(role, "is the role")
    // Create the applicant user
    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        password: hashedPassword,
        phone,
        role_id: role.role_id,
      },
    });
    const generatedToken = generateToken({ username: user.username, email: user.email })
    return res.status(200).json({ message: "Applicant created successfully!", user, token: generatedToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { email, username, password, confirm_password, phone } = req.body;

    // Validate passwords
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if the user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { name: username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email or username." });
    }

    // Hash the password
    const hashedPassword = await hashPwd(password);

    // Get applicant role ID
    const role = await prisma.role.findFirst({
      where: { role_type: "APPLICANT" },
      select: { role_id: true },
    });

    console.log(role, "is the role")
    // Create the applicant user
    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        password: hashedPassword,
        phone,
        role_id: role.role_id,
      },
    });
    const generatedToken = generateToken({ username: user.username, email: user.email })
    return res.status(200).json({ message: "Applicant created successfully!", user, token: generatedToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// creating an mvro 
router.post("/signup/mvro", async (req, res) => {
  try {
    const { email, username, password, confirm_password, phone, mandal, district, state, type } = req.body;

    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const hashedPassword = await hashPwd(password);

    const role = await prisma.role.findFirst({ where: { role_type: "MVRO" }, select: { role_id: true } });

    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        password: hashedPassword,
        phone,
        role_id: role.role_id,
        mvro: {
          create:{
              mandal,
              district,
              state,
              type
          }
        }
      },
      include:{
        mvro:true,
      }
    });

    // const relatedData = await prisma.mVRO.create({
    //   data: { mandal, district, state, type, user: { connect: { user_id: user.user_id } } },
    // });

    return res.status(201).json({ message: "MVRO user created successfully!", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


// svroSignup
router.post("/signup/svro", async (req, res) => {
  try {
    const { email, username, password, confirm_password, phone, pincode, state, district, mandal, sachivalayam } = req.body;

    // Password validation
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Hash the password
    const hashedPassword = await hashPwd(password);

    // Get SVRO role ID
    const role = await prisma.role.findFirst({
      where: { role_type: "SVRO" },
      select: { role_id: true },
    });

    // Create the SVRO user
    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        password: hashedPassword,
        phone,
        role_id: role.role_id,
        svro: {
          create:{
            pincode,
            state,
            district,
            mandal,
            sachivalayam
          }
        }
      },
      include: {
        svro: true,
      }

    });
    const svro = user.svro

    // // Create the SVRO data
    // const svro = await prisma.sVRO.create({
    //   data: { pincode, state, district, mandal, sachivalayam, user: { connect: { user_id: user.user_id } } },
    // });

    // Fetch all MVROs for the given mandal with their assigned Sachivalayams
    const mvros = await prisma.mVRO.findMany({
      where: { mandal, type: "PERMANENT" },
      include: {
        sachivalayams: true, // Include related Sachivalayams
      },
    });

    if (mvros.length === 0) {
      return res.status(400).json({ message: "No MVROs available for this mandal." });
    }

    // Determine the MVRO with the least assigned Sachivalayams
    const mvroToAssign = mvros.reduce((prev, curr) =>
      prev.sachivalayams.length <= curr.sachivalayams.length ? prev : curr
    );

    // Assign the Sachivalayam to the selected MVRO
    const assignedSachivalayam = await prisma.sachivalayam.create({
      data: {
        name: sachivalayam,
        mvro: { connect: { mvro_id: mvroToAssign.mvro_id } },
      },
    });

    return res.status(201).json({
      message: "SVRO created successfully and sachivalayam assigned to MVRO!",
      svro,
      assignedSachivalayam,
      mvroAssignedTo: mvroToAssign,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


// ri signup
router.post("/signup/ri", async (req, res) => {
  try {
    const { email, username, password, confirm_password, phone, mandal, state, district } = req.body;

    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const hashedPassword = await hashPwd(password);

    const role = await prisma.role.findFirst({ where: { role_type: "RI" }, select: { role_id: true } });

    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        password: hashedPassword,
        phone,
        role_id: role.role_id,
        ri: {
          create: {
            mandal,
            state,
            district
          }
        }
      },
    });

    // const relatedData = await prisma.rI.create({
    //   data: { mandal, state, district, user: { connect: { user_id: user.user_id } } },
    // });

    return res.status(201).json({ message: "RI user created successfully!", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


// mro signup
router.post("/signup/mro", async (req, res) => {
  try {
    const { email, username, password, confirm_password, phone, mandal, district, state } = req.body;

    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const hashedPassword = await hashPwd(password);

    const role = await prisma.role.findFirst({ where: { role_type: "MRO" }, select: { role_id: true } });

    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        password: hashedPassword,
        phone,
        role_id: role.role_id,
        mro: {
          create: {
            mandal,
            district,
            state
          }
        }
      },
      include: {
        mro: true,
      }
    });

    // const relatedData = await prisma.mRO.create({
    //   data: { mandal, district, state, user: { connect: { user_id: user.user_id } } },
    // });

    return res.status(201).json({ message: "MRO user created successfully!", user });
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
      select: { user_id: true, name: true, email: true, role_id: true } // Select only required fields
    });

    const role = await prisma.role.findFirst({
      where: {
        role_id: user.role_id
      },
      select: {
        role_type: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user, role: role.role_type });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/all_users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          role_type: {
            not: "ADMIN"
          }
        }
      },
      select: {
        name: true,
        email: true,
        user_id: true,
        role: {
          select: {
            role_type: true, // Assuming the role table has a field `role_type`
          },
        },
      },
    });

    // Transform the data if necessary
    const formattedUsers = users.map(user => ({
      name: user.name,
      email: user.email,
      user_id: user.user_id,
      role_type: user.role.role_type, // Access the role_type directly
    }));

    return res.status(200).json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "An error occurred while fetching users." });
  }
});


module.exports = router;



// router.post("/signup", async (req, res) => {
//   try {
//     const { email, username, password, confirm_password, role, phone, ...rest } = req.body;

//     if (password !== confirm_password) {
//       return res.status(400).json({ message: "Passwords do not match." });
//     }

//     const existingUser = await prisma.user.findFirst({
//       where: {
//         OR: [{ email: email }, { name: username }]
//       }
//     });

//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists with this email or username." });
//     }

//     const hashedPassword = await hashPwd(password);

//     const roleData = await prisma.role.findFirst({
//       where: { role_type: role },
//       select: { role_id: true }
//     });

//     if (!roleData) {
//       return res.status(400).json({ message: "Invalid role specified." });
//     }

//     const roleId = roleData.role_id;
//     let relatedData = null;

//     switch (roleId) {
//       case 3:
//         if (!rest.pincode || !rest.state || !rest.district || !rest.mandal || !rest.sachivalayam) {
//           return res.status(400).json({
//             message: "Pincode, state, district, mandal, and sachivalayam are required for SVRO role."
//           });
//         }
//         break;

//       case 4:
//         if (!rest.village || !rest.mandal || !rest.district || !rest.state || !rest.pincode) {
//           return res.status(400).json({
//             message: "Village, mandal, district, pincode, and state are required for MVRO role."
//           });
//         }
//         break;

//       case 5:
//         if (!rest.region || !rest.state || !rest.district) {
//           return res.status(400).json({
//             message: "Region, state, and district are required for RI role."
//           });
//         }
//         break;

//       case 6:
//         if (!rest.mandal || !rest.district || !rest.state) {
//           return res.status(400).json({
//             message: "Mandal, district, and state are required for MRO role."
//           });
//         }
//         break;

//       default:
//         return res.status(400).json({ message: "Invalid role specified." });
//     }

//     const result = await prisma.$transaction(async (prisma) => {
//       const user = await prisma.user.create({
//         data: {
//           email,
//           name: username,
//           password: hashedPassword,
//           phone,
//           role_id: roleId
//         }
//       });

//       switch (roleId) {
//         case 3:
//           relatedData = await prisma.sVRO.create({
//             data: {
//               pincode: rest.pincode,
//               state: rest.state,
//               district: rest.district,
//               mandal: rest.mandal,
//               sachivalayam: rest.sachivalayam,
//               user: { connect: { user_id: user.user_id } }
//             }
//           });
//           break;

//         case 4:
//           relatedData = await prisma.mVRO.create({
//             data: {
//               mandal: rest.mandal,
//               district: rest.district,
//               state: rest.state,
//               type: rest.type,
//               pincode: rest.pincode,
//               sachivalayam: rest.sachivalayam,
//               user: { connect: { user_id: user.user_id } }
//             }
//           });
//           break;

//         case 5:
//           relatedData = await prisma.rI.create({
//             data: {
//               region: rest.region,
//               state: rest.state,
//               district: rest.district,
//               user: { connect: { user_id: user.user_id } }
//             }
//           });
//           break;

//         case 6:
//           relatedData = await prisma.mRO.create({
//             data: {
//               mandal: rest.mandal,
//               district: rest.district,
//               state: rest.state,
//               user: { connect: { user_id: user.user_id } }
//             }
//           });
//           break;
//       }

//       return { user, relatedData };
//     });

//     return res.status(201).json({
//       message: "User created successfully!",
//       user: result.user,
//       relatedData: result.relatedData
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal server error.", error: error.message });
//   }
// });
