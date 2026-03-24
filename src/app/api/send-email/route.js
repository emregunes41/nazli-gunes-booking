import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');
  try {
    const { to, name, zoomLink, date, time } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      return Response.json({ message: "Resend API Key bulunamadı." }, { status: 500 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Nazlı Güneş <bilgi@withnazligunes.com>',
      to: [to],
      subject: 'Randevunuz Onaylandı - Görüşme Linkiniz İçeride',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #D4AF37;">Merhaba ${name},</h1>
          <p style="font-size: 16px; line-height: 1.5;">
            Danışmanlık randevunuz onaylanmıştır. Görüşmemiz için sabırsızlanıyorum!
          </p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #eee;">
            <p style="margin: 0 0 10px 0;"><strong>Tarih:</strong> ${date}</p>
            <p style="margin: 0 0 10px 0;"><strong>Saat:</strong> ${time}</p>
            <p style="margin: 0;"><strong>Görüşme Linki:</strong></p>
            <a href="${zoomLink}" style="display: inline-block; background-color: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">
              Zoom Görüşmesine Katıl
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Görüşmeden 5 dakika önce linkte hazır olmanız rica olunur. Herhangi bir sorunuz olursa bu maili yanıtlayabilirsiniz.
          </p>
          
          <p style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 14px;">
            Sevgiler,<br>
            <strong>Nazlı Güneş</strong><br>
            <a href="https://withnazligunes.com" style="color: #D4AF37; text-decoration: none;">withnazligunes.com</a>
          </p>
        </div>
      `,
    });

    if (error) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    return Response.json({ success: true, data });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
