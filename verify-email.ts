import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.update({
    where: { email: 'info@haramaya.edu.et' },
    data: { emailVerified: true }
  })
  console.log('Successfully verified email!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
