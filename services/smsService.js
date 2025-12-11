// services/smsService.js
const Twilio = require('twilio');

const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;

let twilioClient = null;
if (TWILIO_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = Twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn('[smsService] Twilio config missing in .env');
}

/**
 * sendSms({ to, body })
 * - Uses Twilio if configured
 * - returns { success, sid | error }
 */
async function sendSms({ to, body }, opts = {}) {
  const maxRetries = opts.retries ?? 2;
  let attempt = 0;
  let lastErr;

  if (!twilioClient) {
    const err = new Error('SMS provider not configured');
    console.warn('[smsService]', err.message);
    return { success: false, error: err };
  }

  while (attempt <= maxRetries) {
    try {
      attempt++;
      const msg = await twilioClient.messages.create({
        from: TWILIO_FROM,
        to,
        body,
      });
      return { success: true, sid: msg.sid, raw: msg };
    } catch (err) {
      lastErr = err;
      console.error(`[smsService] sendSms attempt ${attempt} error:`, err.message || err);
      await new Promise((r) => setTimeout(r, 150 * attempt));
    }
  }

  return { success: false, error: lastErr };
}

module.exports = {
  sendSms,
};
