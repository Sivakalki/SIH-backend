const prisma = require("./prisma")
const { handleDuplicateRechecks } = require("../utils/recheckUtils");

async function main() {
  const admin = await prisma.role.upsert({
    where:{
      role_type: "ADMIN"
    },update:{},
    create:{
      role_type:"ADMIN"
    }
  })
  const applicant = await prisma.role.upsert({
    where:{
      role_type: "APPLICANT"
    },update:{},
    create:{
      role_type:"APPLICANT"
    }
  })
  const svro = await prisma.role.upsert({
    where:{
      role_type: "SVRO"
    },update:{},
    create:{
      role_type:"SVRO"
    }
  })
  const mvro = await prisma.role.upsert({
    where:{
      role_type: "MVRO"
    },update:{},
    create:{
      role_type:"MVRO"
    }
  })
  const ri = await prisma.role.upsert({
    where:{
      role_type: "RI"
    },update:{},
    create:{
      role_type:"RI"
    }
  })
  const mro = await prisma.role.upsert({
    where:{
      role_type: "MRO"
    },update:{},
    create:{
      role_type:"MRO"
    }
  })
  const aadhaar = await prisma.addressProofType.upsert({
    where:{
        addressProofType:"AADHAAR"
    },update:{},
    create:{
        addressProofType:"AADHAAR"
    }
  })
  const electricity = await prisma.addressProofType.upsert({
    where:{
        addressProofType:"ELECTRICITY"
    },update:{},
    create:{
        addressProofType:"ELECTRICITY"
    }
  })
  
  
  const gas = await prisma.addressProofType.upsert({
    where:{
        addressProofType:"GAS"
    },update:{},
    create:{
        addressProofType:"GAS"
    }
  })
  const aadhaar_dob = await prisma.dobProofType.upsert({
    where:{
        dobProofType:"AADHAAR"
    },update:{},
    create:{
        dobProofType:"AADHAAR"
    }
  })
  const pan = await prisma.dobProofType.upsert({
    where:{
        dobProofType:"PAN"
    },update:{},
    create:{
        dobProofType:"PAN"
    }
  })
  const ssc = await prisma.dobProofType.upsert({
    where:{
        dobProofType:"SSC"
    },update:{},
    create:{
        dobProofType:"SSC"
    }
  })
  const fatherCaste = await prisma.casteProofType.upsert({
    where:{
        casteProofType:"FATHER"
    },update:{},
    create:{
        casteProofType:"FATHER"
    }
  })
  const motherCaste = await prisma.casteProofType.upsert({
    where:{
        casteProofType:"MOTHER"
    },update:{},
    create:{
        casteProofType:"MOTHER"
    }
  })
  const oc = await prisma.caste.upsert({
    where:{
        caste_type:"OC"
    },update:{},
    create:{
        caste_type:"OC"
    }
  })
  const obc = await prisma.caste.upsert({
    where:{
        caste_type:"OBC"
    },update:{},
    create:{
        caste_type:"OBC"
    }
  })
  const sc = await prisma.caste.upsert({
    where:{
        caste_type:"SC"
    },update:{},
    create:{
        caste_type:"SC"
    }
  })
  const st = await prisma.caste.upsert({
    where:{
        caste_type:"ST"
    },update:{},
    create:{
        caste_type:"ST"
    }
  })

  const mother = await prisma.parentGuardianType.upsert({
    where:{
      type:"MOTHER"
    },update:{},
    create:{
      type: "MOTHER"
    }
  })
  const father = await prisma.parentGuardianType.upsert({
    where:{
      type:"FATHER"
    },update:{},
    create:{
      type: "FATHER"
    }
  })
  const sibling = await prisma.parentGuardianType.upsert({
    where:{
      type:"SIBLING"
    },update:{},
    create:{
      type: "SIBLING"
    }
  })
  
  // Create 3 recheck requests for testing
  const application = await prisma.application.findFirst();
  if (application) {
    await prisma.reCheck.createMany({
      data: [
        {
          description: "First recheck request",
          application_id: application.application_id,
          status: "PENDING"
        },
        {
          description: "Second recheck request",
          application_id: application.application_id,
          status: "PENDING"
        },
        {
          description: "Third recheck request",
          application_id: application.application_id,
          status: "PENDING"
        }
      ]
    });

    // Handle duplicate rechecks - keep only the first one
    await handleDuplicateRechecks();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })