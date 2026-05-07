require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => console.log('✅ Connected!'))
  .catch(e => console.error('❌ Connection failed:', e))
  .finally(() => prisma.$disconnect());