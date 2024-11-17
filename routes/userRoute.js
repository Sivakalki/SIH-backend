
const express = require("express");
const router = express.Router(); // Initialize the router
const prisma = require('../prisma/prisma')
const { hashPwd, comparePwd } = require("../utils/passwordHash");
const { generateToken } = require("../utils/tokenUtils");


router.get('/', (req, res) => { // Define the route
    res.status(200).send("Hello");
});

router.post('/login', async (req, res) => {
    const users = await prisma.user.findFirst({
        where: {
            email: req.body.email
        }
    }
    )
    if (!users) {
        return res.status(404).json({ "message": "User doesn't exist" })
    }
    let passwordMatch = await comparePwd(req.body.password, users.password)
    // console.log(passwordMatch)
    if (passwordMatch) {
        const generatedToken = generateToken({ username: users.username, email: users.email })
        return res.status(200).json({ "message": "Succesfully logged in", token: generatedToken })
    }
    return res.status(400).json({ "message": "Wrong Password" })
})

router.post("/signup", async (req, res) => {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: req.body.email },
                { username: req.body.username }
            ]
        }
    });
    if (existingUser) {
        return res.status(403).json({ "message": "User already exists with that email-id" })
    }
    if (req.body.password !== req.body.confirm_password) {
        return res.status(403).json({ "message": "Passwords didn't match" })
    }
    try {
        const hashedPassword = await hashPwd(req.body.password)

        const user = await prisma.user.create({
            data: {
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword
            }
        })
        return res.status(200).json({ "message": "User Created Successfully" })
    }
    catch (e) {
        console.log(e)
        return res.status(500).json({ "message": "Something went wrong" })
    }

})


module.exports = router; // Export the router
