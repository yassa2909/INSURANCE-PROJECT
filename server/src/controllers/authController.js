const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOTP, verifyOTP } = require('../services/otpService');
const { findUserByEmail, findUserByPhone, createUser, markUserAsVerified } = require('../models/userModel');

// ─── Validation Rules ───────────────────────────────────────────────────────

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone')
    .trim()
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Phone must be a valid number with country code'),
  body('password')
    .isLength({ min: 5, max: 20 })
    .withMessage('Password must be between 5 and 20 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must include at least one special character (!@#$%^&*)')
    .not()
    .contains(' ')
    .withMessage('Password cannot contain spaces')
    .custom((value, { req }) => {
      if (value === req.body.email || value === req.body.phone) {
        throw new Error('Password must not match email or phone number');
      }
      return true;
    }),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyValidation = [
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('code').trim().isNumeric().isLength({ min: 4, max: 10 }).withMessage('Invalid OTP code'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─── Helper ──────────────────────────────────────────────────────────────────

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  let { name, email, phone, password } = req.body;

  if (phone && !phone.startsWith('+')) {
    phone = '+' + phone;
  }

  try {
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const existingPhone = await findUserByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'Phone number already registered.' });
    }

    // Trigger OTP (don't create user yet)
    const sent = await sendOTP(phone, email);

    const response = { success: true, message: 'OTP sent to your phone.' };
    // In dev/debug mode, `sendOTP` may return the code (when FAKE_TWILIO=true)
    if (sent && sent.code) response.debugCode = sent.code;

    return res.status(200).json(response);
  } catch (err) {
    console.error('❌ Register error:', err);
    let errorMessage = 'Internal server error.';
    if (err.message.includes('Brevo SMS failed')) {
      errorMessage = 'Failed to send OTP via SMS. Please check the phone number or try again later.';
    }

    return res.status(500).json({ 
      success: false, 
      message: errorMessage, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.is_verified) {
      // Re-trigger OTP if not verified
      const sent = await sendOTP(user.phone, user.email);
      const response = {
        success: false,
        message: 'Account not verified. OTP sent to your phone.',
        requiresVerification: true,
        phone: user.phone,
      };
      if (sent && sent.code) response.debugCode = sent.code;
      return res.status(403).json(response);
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error('Login error:', err);
    let errorMessage = 'Internal server error.';
    if (err.message.includes('Brevo SMS failed')) {
      errorMessage = 'Failed to send OTP via SMS. Please check the phone number or try again later.';
    }
    return res.status(500).json({ success: false, message: errorMessage, error: err.message });
  }
};

/**
 * POST /api/auth/verify
 */
const verifyAndRegister = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  let { phone, code, name, email, password } = req.body;
  
  if (phone && !phone.startsWith('+')) {
    phone = '+' + phone;
  }

  try {
    const status = await verifyOTP(phone, code);

    if (status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Now that OTP is verified, create the user in DB
    const user = await createUser({ name, email, phone, password });
    
    // Mark as verified immediately since OTP just passed
    const verifiedUser = await markUserAsVerified(phone);
    
    const token = generateToken(verifiedUser);

    return res.status(201).json({
      success: true,
      message: 'Registration complete and phone verified!',
      token,
      user: { id: verifiedUser.id, name: verifiedUser.name, email: verifiedUser.email, phone: verifiedUser.phone },
    });
  } catch (err) {
    console.error('❌ Verify error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error.',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

module.exports = { 
  register, 
  login, 
  verifyAndRegister, 
  registerValidation, 
  loginValidation, 
  verifyValidation 
};
