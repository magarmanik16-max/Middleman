import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import RefreshToken from '../models/RefreshToken.js';
import { emailService } from '../services/emailService.js';
import { generateTokens } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email domain
    if (!User.isAllowedEmail(email)) {
      return res.status(400).json({ 
        message: 'Only @timesglobal.com.np email addresses are allowed' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = new User({ email, password });
    await user.save();

    // Generate and send OTP (non-fatal if email fails)
    try {
      await emailService.generateAndSendOTP(email);
    } catch (emailError) {
      logger.error('Failed to send OTP email during registration:', emailError.message);
    }

    // Log activity
    await ActivityLog.create({
      userId: user._id,
      action: 'USER_REGISTER',
      resource: 'user',
      resourceId: user._id,
      details: { email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({ 
      message: 'User registered successfully. Please check your email for OTP verification.',
      userId: user._id
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Verify OTP
    const isValid = await emailService.verifyOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update user verification status
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Log activity
    await ActivityLog.create({
      userId: user._id,
      action: 'USER_VERIFY_EMAIL',
      resource: 'user',
      resourceId: user._id,
      details: { email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Email verified successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ message: 'Email verification failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      // Resend OTP if not verified (non-fatal if email fails)
      try {
        await emailService.generateAndSendOTP(email);
      } catch (emailError) {
        logger.error('Failed to resend OTP email:', emailError.message);
      }
      return res.status(403).json({ 
        message: 'Email not verified. New OTP sent to your email.' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);

    // Log activity
    await ActivityLog.create({
      userId: user._id,
      action: 'USER_LOGIN',
      resource: 'user',
      resourceId: user._id,
      details: { email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: rawToken } = req.body;

    if (!rawToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // Verify JWT signature
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(rawToken, process.env.JWT_SECRET);
    
    // Verify token exists in DB and hasn't been revoked
    const stored = await RefreshToken.verifyToken(decoded.userId, rawToken);
    if (!stored) {
      return res.status(401).json({ message: 'Refresh token has been revoked or expired' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Revoke old token and generate new ones (token rotation)
    await RefreshToken.revokeAll(user._id);
    const tokens = await generateTokens(user._id);

    res.json({
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  try {
    // Revoke all refresh tokens for this user
    await RefreshToken.revokeAll(req.user._id);

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'USER_LOGOUT',
      resource: 'user',
      resourceId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and send OTP (non-fatal if email fails)
    await emailService.generateAndSendOTP(email);

    res.json({ message: 'New verification code sent to your email' });
  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend verification code' });
  }
};

export const getMe = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
};