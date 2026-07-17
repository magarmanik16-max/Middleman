import express from 'express';
import { body, validationResult } from 'express-validator';
import { register, verifyEmail, login, refreshToken, logout, getMe, resendOtp } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
];

const validateOTP = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

// Check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes
router.post('/register', validateRegistration, handleValidationErrors, register);
router.post('/verify-email', validateOTP, handleValidationErrors, verifyEmail);
router.post('/verify-otp', validateOTP, handleValidationErrors, verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;