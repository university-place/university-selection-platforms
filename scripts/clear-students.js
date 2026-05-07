const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clear() {
  try {
    const result = await prisma.student.deleteMany({})
    console.log(`✅ Deleted ${result.count} students.`)
    await prisma.$executeRaw`ALTER SEQUENCE "Student_id_seq" RESTART WITH 1;`
    console.log('✅ ID sequence reset to 1.')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}
clear()