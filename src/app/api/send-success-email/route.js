import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');
  try {
    const { booking } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY bulunamadı, e-posta gönderilemiyor.");
      return NextResponse.json({ message: "Resend API Key bulunamadı." }, { status: 500 });
    }

    if (!booking || !booking.email) {
      return NextResponse.json({ message: "Geçersiz istek: Booking veya e-posta eksik." }, { status: 400 });
    }

    const { name, email, date, time } = booking;
    const formattedDate = date ? new Date(date).toLocaleDateString("tr-TR") : "Bilinmiyor";

    // 1. Müşteriye giden mail
    const customerMail = resend.emails.send({
      from: 'Nazlı Güneş <bilgi@withnazligunes.com>',
      to: [email],
      subject: 'Ödemeniz Alındı - Randevunuz Onaylandı',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #D4AF37;">Merhaba ${name},</h1>
          <p style="font-size: 16px; line-height: 1.5;">
            Ödemeniz başarıyla alınmıştır. <strong>${formattedDate}</strong> tarihi saat <strong>${time}</strong> için danışmanlık randevunuz onaylandı.
          </p>
          <p style="font-size: 14px; color: #666;">
            Görüşme linkiniz (Zoom) etkinlikten uygun bir süre önce ayrı bir e-posta ile tarafınıza iletilecektir.
          </p>
          <p style="font-size: 14px; color: #666;">
            Herhangi bir sorunuz olursa bu maili yanıtlayabilirsiniz. Görüşmek üzere!
          </p>
          <p style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 14px;">
            Sevgiler,<br>
            <strong>Nazlı Güneş</strong><br>
            <a href="https://withnazligunes.com" style="color: #D4AF37; text-decoration: none;">withnazligunes.com</a>
          </p>
        </div>
      `,
    });

    // 2. Admin'e giden bildirim maili
    const adminMail = resend.emails.send({
      from: 'Sistem Bildirimi <bilgi@withnazligunes.com>',
      to: ['withnazligunes@gmail.com'],
      subject: 'Yeni Ödeme Tamamlandı - Başarılı Randevu',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; color: #333; background: #fafafa; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #111;">Yeni Bir Ödeme Tamamlandı! 🎉</h2>
          <p style="font-size: 15px;">Admin panelinden bir rezervasyon <strong>Ödendi (PAID)</strong> durumuna güncellendi ve başarılı olarak işaretlendi.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Müşteri:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>E-posta:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Telefon:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.phone || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Sosyal Medya:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.socialMedia || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Tarih / Saat:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedDate} - ${time}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; font-size: 14px; color: #555;">
            Sisteme giriş yaparak detayları görüntüleyebilir ve Zoom linkini gönderebilirsiniz.
          </p>
        </div>
      `,
    });

    // Paralel gönderim
    await Promise.all([customerMail, adminMail]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Success Email API Error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
