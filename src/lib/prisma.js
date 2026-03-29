import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Vercel'deki kopyalama hataları (tırnak/boşluk) için ortam değişkenini direkt temizle
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.trim().replace(/^"|"$/g, '');
  }

  const url = process.env.DATABASE_URL;
  
  if (!url && process.env.NODE_ENV === "production") {
    console.warn("WARNING: DATABASE_URL is missing!");
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
