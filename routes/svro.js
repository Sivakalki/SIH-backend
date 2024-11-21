const express = require("express")
const path = require('path')
const prisma = require("../prisma/prisma")

const router = express.Router()

router.get("/all_applications/:curr_id",async (req,res)=>{
    const curr_user_id= req.params.curr_id
    try{
        const reports = await prisma.application.findMany({
            where:{
                svro_id : curr_user_id
            },
            include: {
                address: true, // Include related address details
                caste: true, // Include related caste details
                addressProof: true, // Include related address proof details
                dobProof: true, // Include related DOB proof details
                casteProof: true, // Include related caste proof details
              },
        })
        return res.status(200).json({"data":reports})
    }
    catch(e){
        console.log(e)
        res.status(400).json({"message":"There is an error in the request"})
    }
})

router.get("/all_pending_applications:svro_id",async (req,res)=>{
    const curr_user_id= req.params.curr_id
    try{
        const reports = await prisma.application.findMany({
            where:{
                svro_id : curr_user_id,
                status : 'PENDING',
            },
            include: {
                address: true, // Include related address details
                caste: true, // Include related caste details
                addressProof: true, // Include related address proof details
                dobProof: true, // Include related DOB proof details
                casteProof: true, // Include related caste proof details
              },
        })
        return res.status(200).json({"data":reports})
    }
    catch(e){
        console.log(e)
        res.status(400).json({"message":"There is an error in the request"})
    }
})

