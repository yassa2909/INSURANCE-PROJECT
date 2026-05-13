const https = require('https');

// In-memory store for OTPs (for production, consider Redis or a database table)
const otpStore = new Map();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FAKE_OTP = process.env.FAKE_OTP === 'true';

/**
 * Send OTP via Brevo Transactional Email
 * @param {string} email - Recipient email
 * @param {string} code - OTP code
 */
const sendEmailOTP = async (email, code) => {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@brevo.com';
  console.info(`[OTP] Sending email from: ${senderEmail}`);

  const data = JSON.stringify({
    sender: { name: 'Insurance AI Advisor', email: senderEmail },
    to: [{ email: email }],
    subject: 'Your Verification Code',
    htmlContent: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Verification Code</h2>
        <p>Your verification code for Insurance AI is:</p>
        <div style="font-size: 24px; font-weight: bold; color: #007bff; padding: 10px; background: #f8f9fa; border-radius: 4px; display: inline-block;">
          ${code}
        </div>
        <p style="margin-top: 20px; color: #666;">Valid for 5 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `
  });

  const options = {
    hostname: 'api.brevo.com',
    port: 443,
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      'content-length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: 'pending' });
        } else {
          reject(new Error(`Brevo Email failed: ${responseData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

/**
 * Send OTP via Brevo (Email-Primary for FREE tier)
 * @param {string} phone - User phone number
 * @param {string} email - User email address
 */
const sendOTP = async (phone, email = null) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 5 * 60 * 1000;

  // Still store using phone as key to keep current verify logic working
  otpStore.set(phone, { code, expires });

  if (FAKE_OTP) {
    console.info(`[FAKE_OTP] Code for ${phone}: ${code} (expires in 5m)`);
    return { status: 'pending', code };
  }

  // --- PRIMARY: Email (FREE) ---
  if (email) {
    try {
      console.info(`[OTP] Sending FREE Email OTP to: ${email}`);
      await sendEmailOTP(email, code);
      return { status: 'pending' };
    } catch (err) {
      console.error('Email sending failed:', err.message);
    }
  }

  // --- SECONDARY: SMS (Requires Paid Credits) ---
  const formattedPhone = phone.replace('+', '');
  console.info(`[OTP] Attempting SMS (Fallback) to: ${formattedPhone}`);

  const data = JSON.stringify({
    type: 'transactional',
    sender: 'INSURE',
    recipient: formattedPhone,
    content: `Your verification code for Insurance AI is: ${code}. Valid for 5 minutes.`
  });

  const options = {
    hostname: 'api.brevo.com',
    port: 443,
    path: '/v3/transactionalSMS/sms',
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
      'content-length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.info(`✅ SMS successfully sent to ${formattedPhone}`);
          resolve({ status: 'pending' });
        } else if (res.statusCode === 402) {
          const msg = '❌ Brevo Error: No SMS credits. Please use Email OTP or buy credits.';
          console.error(msg);
          reject(new Error(msg));
        } else {
          console.error('❌ Brevo SMS Failure:', responseData);
          reject(new Error(`SMS failed: ${responseData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

/**
 * Verify OTP code
 * @param {string} phone - E.164 formatted phone number
 * @param {string} code - OTP code to verify
 */
const verifyOTP = async (phone, code) => {
  // Check verified test numbers (from env)
  const testNumbers = (process.env.VERIFIED_TEST_NUMBERS || '')
    .split(',')
    .map(n => n.trim());
  
  if (testNumbers.includes(phone)) {
    console.info(`[OTP] Auto-approved verified test number ${phone}`);
    return 'approved';
  }

  const stored = otpStore.get(phone);
  if (!stored) return 'pending';

  if (Date.now() > stored.expires) {
    otpStore.delete(phone);
    return 'pending';
  }

  if (stored.code === String(code)) {
    otpStore.delete(phone);
    return 'approved';
  }

  return 'pending';
};

module.exports = { sendOTP, verifyOTP };
