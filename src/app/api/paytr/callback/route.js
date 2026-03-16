import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Resend } from 'resend';

// Configure resend outside of handler
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const merchant_oid = formData.get('merchant_oid');
    const status = formData.get('status');
    const total_amount = formData.get('total_amount');
    const merchant_trade_id = formData.get('merchant_trade_id'); // If extra fields are sent
    const hash = formData.get('hash');
    const failed_reason_code = formData.get('failed_reason_code');
    const failed_reason_msg = formData.get('failed_reason_msg');
    const payment_type = formData.get('payment_type');
    
    // Note: Since formData.get returns string or null, we cast to string when using.
    const merchant_key = process.env.PAYTR_MERCHANT_KEY || '';
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT || '';

    // Validate request hash
    const hash_str = merchant_oid + merchant_salt + status + total_amount;
    const computed_hash = crypto.createHmac('sha256', merchant_key).update(hash_str).digest('base64');

    if (hash !== computed_hash) {
      console.error("PAYTR CALLBACK HASH MATCH ERROR!");
      return new NextResponse('PAYTR validation failed', { status: 400 });
    }

    // In a real app we fetch the booking doc by merchant_oid which usually equals booking ID
    const bookingRef = doc(db, 'bookings', merchant_oid.toString());

    if (status === 'success') {
      console.log(`Payment successful for OID: ${merchant_oid}`);
      
      // Update booking status in firestore
      await updateDoc(bookingRef, {
        status: 'PAID',
        paymentDate: new Date().toISOString(),
      });

      // Send email to client using Resend
      if (process.env.RESEND_API_KEY) {
         // You'd fetch the email from the booking doc here normally, mocked for now
         // const snapshot = await getDoc(bookingRef);
         // const email = snapshot.data().email;
         
         // Example email implementation:
         /*
         await resend.emails.send({
            from: 'Rezervasyon <onay@nazligunes.com>',
            to: email, // Get from DB
            subject: 'Randevunuz Onaylandı!',
            html: '<p>Randevunuz başarıyla oluşturuldu. Teşekkür ederiz.</p>',
         });
         */
      }

    } else {
      console.log(`Payment failed for OID: ${merchant_oid}. Reason: ${failed_reason_msg}`);
      
      await updateDoc(bookingRef, {
        status: 'FAILED',
        failReason: failed_reason_msg,
      });
    }

    // PayTR expects exactly "OK" as response to acknowledge callback received
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });

  } catch (error) {
    console.error("PayTR webhook error:", error);
    return new NextResponse('Error', { status: 500 });
  }
}
