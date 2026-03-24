import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

// Connection string to the website's database
const pool = new Pool({
  connectionString: process.env.WEBSITE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      // Fetch users from the website database
      // Ordering by createdAt (most recent first)
      const res = await client.query('SELECT name, email, gender, age, phone, "createdAt" FROM "User" ORDER BY "createdAt" DESC');
      return NextResponse.json(res.rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database connection error:", err);
    return NextResponse.json({ error: "Veritabanı bağlantı hatası", details: err.message }, { status: 500 });
  }
}
