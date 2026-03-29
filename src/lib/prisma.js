import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const url = process.env.WEBSITE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV === "production") {
    console.warn("WARNING: Both WEBSITE_DATABASE_URL and DATABASE_URL are missing!");
  }
  return new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  })
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export { prisma }

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
