import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  if (process.env.NEON_DATABASE_URL) {
    // Vercel kopyalama hataları için her iki koldan temizle
    process.env.NEON_DATABASE_URL = process.env.NEON_DATABASE_URL.trim().replace(/^"|"$/g, '');
    console.log("DIAGNOSTIC - NEON URL Start:", process.env.NEON_DATABASE_URL.substring(0, 20) + "...");
  }

  const url = process.env.NEON_DATABASE_URL;
  
  if (!url && process.env.NODE_ENV === "production") {
    console.warn("DIAGNOSTIC - WARNING: NEON_DATABASE_URL is MISSING or EMPTY!");
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
