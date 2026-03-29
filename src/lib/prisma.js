import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Gereksiz boşlukları ve tırnakları temizle (Vercel kopyalama hataları için)
  const url = process.env.DATABASE_URL?.trim().replace(/^"|"$/g, '');
  
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
