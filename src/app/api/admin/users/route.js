import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Prisma singleton üzerinden temizlenmiş NEON_DATABASE_URL ile üyeleri çek
    const users = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        gender: true,
        age: true,
        phone: true,
        createdAt: true,
        role: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error("User Fetch Error:", err);
    return NextResponse.json({ 
      error: "Veritabanı bağlantı hatası", 
      details: err.message 
    }, { status: 500 });
  }
}
