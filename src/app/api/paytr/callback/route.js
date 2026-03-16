import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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
    if (db) {
      try {
        const bookingRef = doc(db, 'bookings', merchant_oid.toString());

        if (status === 'success') {
          console.log(`[PayTR Callback] Payment successful for OID: ${merchant_oid}`);
          await updateDoc(bookingRef, {
            status: 'PAID',
            paymentDate: new Date().toISOString(),
          });
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

    // Send confirmation email if Resend is configured and payment succeeded
    if (resend && status === 'success') {
      try {
        // In production, fetch email from the booking document
        console.log("[PayTR Callback] Email sending configured but skipped (fetch email from DB first)");
      } catch (emailErr) {
        console.warn("[PayTR Callback] Email sending failed:", emailErr.message);
      }
    }

    // PayTR expects exactly "OK" as response
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });

  } catch (error) {
    console.error("[PayTR Callback] Webhook error:", error);
    return new NextResponse('OK', { status: 200 }); // Still return OK to prevent PayTR retries
  }
}

