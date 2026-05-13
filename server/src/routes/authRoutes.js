const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
  register, 
  login, 
  verifyAndRegister, 
  registerValidation, 
  loginValidation, 
  verifyValidation 
} = require('../controllers/authController');
const { submitPolicy } = require('../controllers/policyController');
const { getProfile } = require('../controllers/userController');
const { sendChatMessage } = require('../controllers/chatController');
const { uploadQuoteDocuments } = require('../controllers/quotesController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiter: max 5 OTP requests per 15 minutes per IP
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
  },
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// POST /api/auth/register   → Create unverified user & send OTP
router.post('/auth/register', registerValidation, register);

// POST /api/auth/login      → Verify credentials & check is_verified
router.post('/auth/login', loginValidation, login);

// POST /api/auth/verify     → Verify OTP & mark as verified
router.post('/auth/verify', verifyValidation, verifyAndRegister);

// POST /api/auth/send-otp   → Manual resend OTP
router.post('/auth/send-otp', otpRateLimiter, async (req, res) => {
  const { phone } = req.body;
  const { sendOTP } = require('../services/otpService');
  try {
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });
    const sent = await sendOTP(phone);
    const response = { success: true, message: 'OTP sent!' };
    if (sent && sent.code) response.debugCode = sent.code;
    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// ─── User Routes ─────────────────────────────────────────────────────────────
router.get('/user/profile', authMiddleware, getProfile);

// ─── Policy Routes ────────────────────────────────────────────────────────────
router.post('/policies', authMiddleware, submitPolicy);

// ─── Quote Document Upload ───────────────────────────────────────────────────
router.post('/quotes/:quoteId/documents', authMiddleware, uploadQuoteDocuments);
// Development-only: public upload route for testing without auth
router.post('/debug/quotes/:quoteId/documents', uploadQuoteDocuments);

// ─── Chat Routes (RAG API via FastAPI) ───────────────────────────────────────
router.post('/chat', authMiddleware, sendChatMessage);

module.exports = router;
