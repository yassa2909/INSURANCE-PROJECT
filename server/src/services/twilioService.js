const twilio = require('twilio');

const useFake = process.env.FAKE_TWILIO === 'true';

let client;
if (!useFake) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

const serviceSid = process.env.TWILIO_SERVICE_SID;

// Parse verified test numbers from env
const verifiedTestNumbers = (process.env.VERIFIED_TEST_NUMBERS || '')
  .split(',')
  .map(n => n.trim())
  .filter(n => n);

// In-memory store for development-only OTPs when FAKE_TWILIO=true
const fakeOtpStore = new Map();

const ensureVerifyServiceSid = () => {
  if (!serviceSid) {
    throw new Error('TWILIO_SERVICE_SID is missing from environment variables.');
  }

  if (!serviceSid.startsWith('VA')) {
    throw new Error(
      'TWILIO_SERVICE_SID must be a Twilio Verify Service SID that starts with VA. The current value looks like a Messaging Service SID (MG).'
    );
  }
};

/**
 * Send OTP to a phone number using Twilio Verify API
 * @param {string} phone - E.164 formatted phone number (e.g. +1234567890)
 */
const sendOTP = async (phone) => {
  // Development shortcut: fake OTPs for testing without Twilio
  if (useFake) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    fakeOtpStore.set(phone, { code, expires });
    console.info(`[FAKE_TWILIO] Sent OTP ${code} to ${phone} (expires in 5m)`);
    // Return the code for developer convenience (only when FAKE_TWILIO=true)
    return { status: 'pending', code };
  }

  try {
    ensureVerifyServiceSid();
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: 'sms' });

    return { status: verification.status }; // 'pending'
  } catch (error) {
    console.error('Twilio Error Details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
      details: error.details
    });
    throw error;
  }
};

/**
 * Verify OTP code submitted by user
 * @param {string} phone - E.164 formatted phone number
 * @param {string} code  - OTP code entered by user
 */
const verifyOTP = async (phone, code) => {
  // Development shortcut: verify against in-memory store when FAKE_TWILIO=true
  if (useFake) {
    // Auto-approve verified test numbers for local testing
    if (verifiedTestNumbers.includes(phone)) {
      console.info(`[FAKE_TWILIO] Auto-approved verified test number ${phone}`);
      return 'approved';
    }
    const stored = fakeOtpStore.get(phone);
    if (!stored) return 'pending';
    if (Date.now() > stored.expires) {
      fakeOtpStore.delete(phone);
      return 'pending';
    }
    if (stored.code === String(code)) {
      fakeOtpStore.delete(phone);
      return 'approved';
    }
    return 'pending';
  }

  ensureVerifyServiceSid();

  const verificationCheck = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({ to: phone, code });

  return verificationCheck.status; // 'approved' or 'pending'
};

module.exports = { sendOTP, verifyOTP };
