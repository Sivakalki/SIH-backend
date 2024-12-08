const prisma = require("../prisma/prisma");

async function handleDuplicateRechecks() {
    try {
        // Get all applications that have more than one recheck
        const applicationsWithMultipleRechecks = await prisma.application.findMany({
            where: {
                reCheck: {
                    some: {}
                }
            },
            include: {
                reCheck: {
                    orderBy: {
                        created_at: 'asc'
                    }
                }
            }
        });

        for (const application of applicationsWithMultipleRechecks) {
            if (application.reCheck.length > 1) {
                // Keep the first recheck (oldest) and delete the rest
                const [firstRecheck, ...recheckToDelete] = application.reCheck;
                
                if (recheckToDelete.length > 0) {
                    // Delete all rechecks except the first one
                    await prisma.reCheck.deleteMany({
                        where: {
                            id: {
                                in: recheckToDelete.map(r => r.id)
                            }
                        }
                    });
                    
                    console.log(`Deleted ${recheckToDelete.length} duplicate rechecks for application ${application.application_id}`);
                }
            }
        }

        console.log("Successfully handled duplicate rechecks");
    } catch (error) {
        console.error("Error handling duplicate rechecks:", error);
        throw error;
    }
}

module.exports = {
    handleDuplicateRechecks
};

handleDuplicateRechecks();