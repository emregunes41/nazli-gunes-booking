import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Prisma singleton üzerinden temizlenmiş NEON_DATABASE_URL ile üyeleri çek
    const users = await prisma.user.findMany({
      select: {
        id: true, // Silme işlemi için ID gerekli
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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Kullanıcı ID gereklidir." }, { status: 400 });
    }

    // Kullanıcıyı veritabanından kalıcı olarak sil
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Kullanıcı başarıyla silindi." });
  } catch (err) {
    console.error("User Delete Error:", err);
    return NextResponse.json({ 
      error: "Kullanıcı silinemedi", 
      details: err.message 
    }, { status: 500 });
  }
}
