import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const { email, name, phone, paymentAmount, userAddress, userBasket, merchantOid } = await req.json();
    
    // Get user IP from request headers
    const headersList = await headers();
    const userIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || '127.0.0.1';

    // These credentials should be set in .env.local
    const merchant_id = process.env.PAYTR_MERCHANT_ID?.trim();
    const merchant_key = process.env.PAYTR_MERCHANT_KEY?.trim();
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT?.trim();

    if (!merchant_id || !merchant_key || !merchant_salt) {
      console.warn("PayTR credentials not found in environment.");
      return NextResponse.json({ error: "Ödeme altyapısı yapılandırılmamış." }, { status: 500 });
    }

    const email_str = (email || "").trim();
    const payment_amount_str = (paymentAmount * 100).toString(); // Convert to kuruş
    const merchant_oid_str = merchantOid;
    const user_name_str = name || "Müşteri";
    const user_address_str = userAddress || "Belirtilmedi";
    const user_phone_str = phone || "";
    const user_ip_str = userIp || "127.0.0.1";
    
    // Standard required params
    const merchant_ok_url = `${process.env.NEXT_PUBLIC_APP_URL?.trim()}/success`;
    const merchant_fail_url = `${process.env.NEXT_PUBLIC_APP_URL?.trim()}/fail`;
    const timeout_limit = "30";
    const debug_on = "1";
    const test_mode = process.env.NEXT_PUBLIC_PAYTR_TEST_MODE?.trim() === "1" ? "1" : "0";
    const no_installment = "0";
    const max_installment = "0";
    const currency = "TL";

    const user_basket_str = Buffer.from(JSON.stringify(userBasket)).toString('base64');

    // Create hash string — PayTR docs order:
    // merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode
    const hash_str = merchant_id + user_ip_str + merchant_oid_str + email_str + payment_amount_str + user_basket_str + no_installment + max_installment + currency + test_mode;
    
    // Create token
    const token = crypto.createHmac('sha256', merchant_key).update(hash_str + merchant_salt).digest('base64');

    // DEBUG: Log all parameters being sent
    console.log("[PayTR] === FULL DEBUG ===");
    console.log("[PayTR] merchant_id:", merchant_id);
    console.log("[PayTR] user_ip:", user_ip_str);
    console.log("[PayTR] merchant_oid:", merchant_oid_str);
    console.log("[PayTR] email:", email_str);
    console.log("[PayTR] payment_amount:", payment_amount_str);
    console.log("[PayTR] user_basket (raw):", JSON.stringify(userBasket));
    console.log("[PayTR] user_basket (b64):", user_basket_str);
    console.log("[PayTR] no_installment:", no_installment);
    console.log("[PayTR] max_installment:", max_installment);
    console.log("[PayTR] currency:", currency);
    console.log("[PayTR] test_mode:", test_mode);
    console.log("[PayTR] merchant_ok_url:", merchant_ok_url);
    console.log("[PayTR] merchant_fail_url:", merchant_fail_url);
    console.log("[PayTR] token:", token);
    console.log("[PayTR] === END DEBUG ===");

    const postData = new URLSearchParams({
      merchant_id,
      user_ip: user_ip_str,
      merchant_oid: merchant_oid_str,
      email: email_str,
      payment_amount: payment_amount_str,
      paytr_token: token,
      user_basket: user_basket_str,
      debug_on,
      no_installment,
      max_installment,
      user_name: user_name_str,
      user_address: user_address_str,
      user_phone: user_phone_str,
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit,
      currency,
      test_mode
    });

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds

    try {
      const response = await fetch("https://www.paytr.com/odeme/api/get-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: postData.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const bodyText = await response.text();
      console.log("[PayTR] Raw Response:", bodyText);

      let body;
      try {
        body = JSON.parse(bodyText);
      } catch (parseErr) {
        console.error("[PayTR] Could not parse response as JSON:", bodyText);
        return NextResponse.json({ error: "PayTR'den geçersiz yanıt: " + bodyText.substring(0, 200) }, { status: 502 });
      }

      if (body.status === "success") {
        console.log("[PayTR] Token generated successfully");
        return NextResponse.json({ token: body.token });
      } else {
        console.error("[PayTR] Token Error:", body.reason, "Details:", JSON.stringify(body));
        return NextResponse.json({ error: body.reason }, { status: 400 });
      }
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        console.error("[PayTR] Request timed out after 15s");
        return NextResponse.json({ error: "PayTR sunucusuna bağlanılamadı (zaman aşımı). Lütfen tekrar deneyin." }, { status: 504 });
      }
      throw fetchErr;
    }

  } catch (error) {
    console.error("[PayTR] generate token error:", error);
    return NextResponse.json({ error: "Sunucu hatası: " + error.message }, { status: 500 });
  }
}
