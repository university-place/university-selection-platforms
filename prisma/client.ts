import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Prisma 7 requires an adapter (configured via prisma.config.ts + DATABASE_URL)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const prismaClientSingleton = () => new PrismaClient({ adapter })

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClientSingleton | undefined
}

const prisma = global.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
