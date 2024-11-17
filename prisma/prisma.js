const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Graceful handling of Prisma lifecycle and errors
const handlePrismaError = (error) => {
  console.error('Prisma Client Error:', error);
};

const gracefulShutdown = async () => {
  try {
    console.log('Closing Prisma Client...');
    await prisma.$disconnect();
    console.log('Prisma Client closed successfully.');
  } catch (error) {
    console.error('Error during Prisma Client shutdown:', error);
  }
};

// Handle uncaught exceptions and termination signals
process.on('uncaughtException', (error) => {
  handlePrismaError(error);
  gracefulShutdown().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  handlePrismaError(reason);
  gracefulShutdown().finally(() => process.exit(1));
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Cleaning up...');
  gracefulShutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Cleaning up...');
  gracefulShutdown().finally(() => process.exit(0));
});

// Export the Prisma Client instance
module.exports =  prisma;
