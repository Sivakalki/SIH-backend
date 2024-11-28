const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
dotenv.config({})

const secretkey = process.env.JWT_SECRET
const expireDuration = 2*60*60
const generateToken=(claims)=>{
    return jwt.sign(claims,secretkey,{expiresIn: expireDuration})
}

const verifyToken =(token)=>{
    try{
        return jwt.verify(token, secretkey)
    }
    catch(e){
        return null;
    }
}

// console.log(generateToken("kalki@gmail.com"))
// console.log(verifyToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImthbGtpIiwiZW1haWwiOiJzaXZha2Fsa2kxQGdtYWlsLmNvbSIsImlhdCI6MTczMTgzNTg2MSwiZXhwIjoxNzMxODM5NDYxfQ.fL4IVmNXb-qVCu5UbaUIedDRXbsA8fNChCfdrwTnVvo"))
 
module.exports = {generateToken, verifyToken}