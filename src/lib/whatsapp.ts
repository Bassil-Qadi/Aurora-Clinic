// WhatsApp messaging service using Twilio
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM env vars

interface SendWhatsAppOptions {
  to: string; // Phone number in E.164 format (e.g., +1234567890)
  message: string;
}

/**
 * Send a WhatsApp message via Twilio
 * @param options - WhatsApp message options
 * @returns Promise<boolean> - true if sent successfully, false otherwise
 */
export async function sendWhatsApp(opts: SendWhatsAppOptions): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // Format: whatsapp:+14155238886

  // Validate configuration
  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "⚠️  Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM). " +
        "WhatsApp messages will be logged to the console."
    );
    
    // Dev mode: log WhatsApp to console
    console.log("\n📱 ─── WhatsApp (dev) ────────────────────────────────");
    console.log(`  To:      ${opts.to}`);
    console.log(`  Message: ${opts.message}`);
    console.log("────────────────────────────────────────────────────\n");
    return true;
  }

  try {
    // Format phone number to E.164 if needed
    let toNumber = opts.to;
    if (!toNumber.startsWith("whatsapp:")) {
      // Remove any non-digit characters except +
      toNumber = toNumber.replace(/[^\d+]/g, "");
      // Ensure it starts with +
      if (!toNumber.startsWith("+")) {
        toNumber = `+${toNumber}`;
      }
      toNumber = `whatsapp:${toNumber}`;
    }

    // Ensure from number has whatsapp: prefix
    const from = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          From: from,
          To: toNumber,
          Body: opts.message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Failed to send WhatsApp to ${opts.to}:`, errorData);
      return false;
    }

    const data = await response.json();
    console.log(`✅ WhatsApp sent to ${opts.to} — SID: ${data.sid}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending WhatsApp to ${opts.to}:`, err);
    return false;
  }
}
