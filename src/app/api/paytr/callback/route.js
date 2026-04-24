import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Conditionally import Resend only if API key exists
let resend = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const merchant_oid = formData.get('merchant_oid');
    const status = formData.get('status');
    const total_amount = formData.get('total_amount');
    const hash = formData.get('hash');
    const failed_reason_msg = formData.get('failed_reason_msg');
    
    const merchant_key = process.env.PAYTR_MERCHANT_KEY || '';
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT || '';

    // Validate request hash
    const hash_str = merchant_oid + merchant_salt + status + total_amount;
    const computed_hash = crypto.createHmac('sha256', merchant_key).update(hash_str).digest('base64');

    if (hash !== computed_hash) {
      console.error("[PayTR Callback] HASH MATCH ERROR!");
      return new NextResponse('PAYTR validation failed', { status: 400 });
    }

    // Update Firebase if available
    let bookingData = null;
    if (db) {
      try {
        const bookingRef = doc(db, 'bookings', merchant_oid.toString());

        if (status === 'success') {
          console.log(`[PayTR Callback] Payment successful for OID: ${merchant_oid}`);
          await updateDoc(bookingRef, {
            status: 'PAID',
            paymentDate: new Date().toISOString(),
          });

          // Fetch booking data for email notifications
          try {
            const bookingSnap = await getDoc(bookingRef);
            if (bookingSnap.exists()) {
              bookingData = bookingSnap.data();
              console.log("[PayTR Callback] Booking data fetched for notifications:", bookingData.name);
            }
          } catch (fetchErr) {
            console.warn("[PayTR Callback] Could not fetch booking data:", fetchErr.message);
          }
        } else {
          console.log(`[PayTR Callback] Payment failed for OID: ${merchant_oid}. Reason: ${failed_reason_msg}`);
          await updateDoc(bookingRef, {
            status: 'FAILED',
            failReason: failed_reason_msg,
          });
        }
      } catch (fbErr) {
        console.warn("[PayTR Callback] Firebase update skipped:", fbErr.message);
      }
    } else {
      console.log(`[PayTR Callback] Status: ${status}, OID: ${merchant_oid} (Firebase not configured)`);
    }

    // Send notification emails if Resend is configured and payment succeeded
    if (resend && status === 'success' && bookingData) {
      try {
        const { name, email, phone, socialMedia, date, time, amount } = bookingData;
        const packageName = bookingData.package === 'monthly' ? 'Aylık Danışmanlık' : 'Birebir Danışmanlık (45 Dk)';
        const formattedDate = date ? new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }) : 'Belirtilmedi';
        const formattedAmount = amount ? `${Number(amount).toLocaleString('tr-TR')} TL` : `${(Number(total_amount) / 100).toLocaleString('tr-TR')} TL`;

        const emailPromises = [];

        // 1. Müşteriye onay maili
        if (email) {
          emailPromises.push(
            resend.emails.send({
              from: 'Nazlı Güneş <bilgi@withnazligunes.com>',
              to: [email],
              subject: `Ödemeniz Alındı - ${packageName} Randevunuz Onaylandı ✓`,
              html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #333; background: #ffffff;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #D4AF37, #F5D78E); border-radius: 50%; line-height: 60px; font-size: 28px; font-weight: bold; color: white;">N</div>
                  </div>
                  <h1 style="color: #D4AF37; font-size: 24px; margin-bottom: 8px;">Merhaba ${name},</h1>
                  <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    Ödemeniz başarıyla alınmıştır. <strong>${packageName}</strong> kapsamında randevunuz onaylandı.
                  </p>
                  
                  <div style="background: #faf8f0; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #D4AF37;">
                    <p style="margin: 0 0 12px 0; font-size: 15px;"><strong>📅 Tarih:</strong> ${formattedDate}</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px;"><strong>🕐 Saat:</strong> ${time || 'Belirtilmedi'}</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px;"><strong>📦 Paket:</strong> ${packageName}</p>
                    <p style="margin: 0; font-size: 15px;"><strong>💰 Ödenen Tutar:</strong> ${formattedAmount}</p>
                  </div>

                  <p style="font-size: 14px; color: #666; line-height: 1.6;">
                    Görüşme linkiniz (Zoom) etkinlikten uygun bir süre önce ayrı bir e-posta ile tarafınıza iletilecektir.
                  </p>
                  <p style="font-size: 14px; color: #666;">
                    Herhangi bir sorunuz olursa bu maili yanıtlayabilir veya <strong>0539 205 20 41</strong> numarasından bize ulaşabilirsiniz.
                  </p>
                  
                  <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
                    <p style="font-size: 14px; color: #888;">
                      Sevgiler,<br>
                      <strong style="color: #333;">Nazlı Güneş</strong><br>
                      <a href="https://withnazligunes.com" style="color: #D4AF37; text-decoration: none;">withnazligunes.com</a>
                    </p>
                  </div>
                </div>
              `,
            })
          );
        }

        // 2. Admin'e bildirim maili
        emailPromises.push(
          resend.emails.send({
            from: 'Sistem Bildirimi <bilgi@withnazligunes.com>',
            to: ['withnazligunes@gmail.com'],
            subject: `🔔 Yeni Randevu & Ödeme - ${name || 'Müşteri'} (${packageName})`,
            html: `
              <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 28px 32px; text-align: center;">
                  <h1 style="color: #D4AF37; font-size: 22px; margin: 0 0 4px 0;">🎉 Yeni Randevu Alındı!</h1>
                  <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0;">Ödeme başarıyla tamamlandı</p>
                </div>

                <!-- Content -->
                <div style="padding: 32px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #333; width: 140px; font-size: 14px;">👤 Müşteri</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-size: 14px;">${name || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #333; font-size: 14px;">📧 E-posta</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-size: 14px;">${email || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #333; font-size: 14px;">📱 Telefon</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-size: 14px;">${phone || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #333; font-size: 14px;">📸 Sosyal Medya</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-size: 14px;">${socialMedia || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #333; font-size: 14px;">📦 Paket</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-size: 14px;">
                        <span style="background: ${bookingData.package === 'monthly' ? '#D4AF37' : '#6c5ce7'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${packageName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #333; font-size: 14px;">📅 Tarih</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-size: 14px;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #333; font-size: 14px;">🕐 Saat</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-size: 14px;">${time || '-'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; font-weight: 600; color: #333; font-size: 14px;">💰 Ödenen Tutar</td>
                      <td style="padding: 14px 16px; color: #27ae60; font-size: 16px; font-weight: 700;">${formattedAmount}</td>
                    </tr>
                  </table>

                  ${bookingData.brandStory || bookingData.challenge || bookingData.topics ? `
                  <div style="margin-top: 24px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #333;">📋 Danışmanlık Öncesi Notlar</h3>
                    ${bookingData.brandStory ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555;"><strong>Marka Hikayesi:</strong> ${bookingData.brandStory}</p>` : ''}
                    ${bookingData.targetAudience ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555;"><strong>Hedef Kitle:</strong> ${bookingData.targetAudience}</p>` : ''}
                    ${bookingData.competitors ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555;"><strong>Rakipler:</strong> ${bookingData.competitors}</p>` : ''}
                    ${bookingData.challenge ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #555;"><strong>Zorluk:</strong> ${bookingData.challenge}</p>` : ''}
                    ${bookingData.topics ? `<p style="margin: 0; font-size: 13px; color: #555;"><strong>Konuşulacak Konular:</strong> ${bookingData.topics}</p>` : ''}
                  </div>
                  ` : ''}
                </div>

                <!-- Footer -->
                <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="margin: 0; font-size: 12px; color: #999;">
                    Booking ID: ${merchant_oid} · ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                  </p>
                </div>
              </div>
            `,
          })
        );

        await Promise.all(emailPromises);
        console.log("[PayTR Callback] ✅ Notification emails sent successfully");
      } catch (emailErr) {
        // Email failure should NOT prevent the OK response to PayTR
        console.error("[PayTR Callback] ❌ Email sending failed:", emailErr.message);
      }
    }

    // PayTR expects exactly "OK" as response
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });

  } catch (error) {
    console.error("[PayTR Callback] Webhook error:", error);
    return new NextResponse('OK', { status: 200 }); // Still return OK to prevent PayTR retries
  }
}

