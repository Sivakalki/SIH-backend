// Import the Prisma Client
const { PrismaClient } = require('@prisma/client');

// Create a new Prisma Client instance
const prisma = new PrismaClient();

// Function to clear all records from a specific table
async function clearTable() {
  try {
    // Example: Delete all records from the 'User' table
    await prisma.vRO.deleteMany({});
    console.log('Table cleared successfully');
  } catch (error) {
    console.error('Error clearing table:', error);
  } finally {
    // Disconnect Prisma client to avoid hanging processes
    await prisma.$disconnect();
  }
}

// Call the function to clear the table
clearTable();
