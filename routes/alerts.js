const prisma = require("../prisma/prisma")
const { all } = require("./ri")
const { sendMail } = require("../utils/sendEmail");
const cron = require('node-cron');
const mro_total_application =async(mro_id, email)=>{
    const mro = await prisma.mRO.findFirst({
        where: {
            mro_id: mro_id
        }
    })

    const pending_applications = await prisma.application.count({
        where: {
            status: "PENDING",
            mro_user_id: mro.mro_id,
            current_stage: {
                role_type: "MRO"
            },
        }
    })
    if(pending_applications >= 0){ 
    const emails = await sendMail(email,`${pending_applications} are the pending_applications for you, make sure to verify fast `, "Pending Applications of CasteApplication")
    }
    return 
}
const ri_total_application =async(ri_id, email)=>{
    const ri = await prisma.rI.findFirst({
        where: {
            ri_id: ri_id
        }
    })

    const pending_applications = await prisma.application.count({
        where: {
            status: "PENDING",
            ri_user_id: ri.ri_id,
            current_stage: {
                role_type: "RI"
            },
        }
    })
    if(pending_applications >= 0){  
    const emails = await sendMail(email,`${pending_applications} are the pending_applications for you, make sure to verify fast `, "Pending Applications of CasteApplication")
    }
    return 
}
const mvro_total_application =async(mvro_id, email)=>{
    const mvro = await prisma.mVRO.findFirst({
        where: {
            mvro_id: mvro_id
        }
    })

    const pending_applications = await prisma.application.count({
        where: {
            status: "PENDING",
            mvro_user_id: mvro.mvro_id,
            current_stage: {
                role_type: "MVRO"
            },
        }
    })
    if(pending_applications >= 0){
    const emails = await sendMail(email,`${pending_applications} are the pending_applications for you, make sure to verify fast `, "Pending Applications of CasteApplication")
    }
    return 
}
const svro_total_application =async(svro_id, email)=>{
    console.log(email, " is the svro_emil")

    const svro = await prisma.sVRO.findFirst({
        where: {
            svro_id: svro_id
        }
    })

    const pending_applications = await prisma.application.count({
        where: {
            status: "PENDING",
            svro_user_id: svro.svro_id,
            current_stage: {
                role_type: "SVRO"
            },
        }
    })
    if(pending_applications >= 0){
    const emails = await sendMail(email,`${pending_applications} are the pending_applications for you, make sure to verify fast `, "Pending Applications of CasteApplication")
    }
    return 
}

const allsvros = async ()=>{
    const all_svros = await prisma.sVRO.findMany({
        include: {
            user: true
        }
    })
    all_svros.forEach(element => {
        svro_total_application(element.svro_id, element.user.email)
    });
    return console.log("done")
}

const allmros = async ()=>{
    const all_mros = await prisma.mRO.findMany({
        include: {
            user: true
        }
    })
    all_mros.forEach(element => {
        mro_total_application(element.mro_id, element.user.email)
    });
    return console.log("done")
}

const allris = async ()=>{
    const all_ris = await prisma.rI.findMany({
        include: {
            user: true
        }
    })
    all_ris.forEach(element => {
        ri_total_application(element.ri_id, element.user.email)
    });
    return console.log("done")
}   

const allmvros = async ()=>{
    const all_mvros = await prisma.mVRO.findMany({
        include: {
            user: true
        }
    })
    all_mvros.forEach(element => {
        mvro_total_application(element.mvro_id, element.user.email)
    });
    return console.log("done")
}   

// Schedule the functions to run every Monday at 00:00 (midnight)
cron.schedule('0 9 * * 1', async () => {
    console.log('Running scheduled tasks...');
    await allsvros();
    await allmros();
    await allris();
    await allmvros();
});

allmvros()